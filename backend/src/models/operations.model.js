import { supabaseAdmin } from "../db.js";

const query = async (builder) => { const { data, error } = await builder; if (error) throw error; return data; };
export const getDefaultBranch = async (tenantId) => (await query(supabaseAdmin.from("branches").select("id,name").eq("tenant_id",tenantId).eq("status","active").limit(1).single()));

export const listCategories = (tenantId) => query(supabaseAdmin.from("product_categories").select("*").eq("tenant_id",tenantId).order("sort_order"));
export const createCategory = (tenantId, values) => query(supabaseAdmin.from("product_categories").insert({tenant_id:tenantId,...values}).select().single());
export const updateCategory = (tenantId,id,values) => query(supabaseAdmin.from("product_categories").update(values).eq("tenant_id",tenantId).eq("id",id).select().single());
export const categoryProductCount = async (tenantId,id) => {const {count,error}=await supabaseAdmin.from("products").select("id",{count:"exact",head:true}).eq("tenant_id",tenantId).eq("category_id",id).eq("is_active",true);if(error)throw error;return count||0};
export const deactivateCategory = (tenantId,id) => query(supabaseAdmin.from("product_categories").update({is_active:false}).eq("tenant_id",tenantId).eq("id",id).select().single());
const productSelection="*,product_categories(name),product_option_groups(*,product_options(*,component_product:products!product_options_component_product_id_fkey(id,name,is_active)))";
export const listProducts = (tenantId) => query(supabaseAdmin.from("products").select(productSelection).eq("tenant_id",tenantId).order("name"));
export const findProduct = async (tenantId,id) => { const {data,error}=await supabaseAdmin.from("products").select(productSelection).eq("tenant_id",tenantId).eq("id",id).maybeSingle();if(error)throw error;return data; };
export const createProduct = (tenantId, values) => query(supabaseAdmin.from("products").insert({tenant_id:tenantId,...values}).select("*,product_categories(name)").single());
export const updateProduct = (tenantId,id,values) => query(supabaseAdmin.from("products").update(values).eq("tenant_id",tenantId).eq("id",id).select(productSelection).single());
export const deactivateProduct = (tenantId,id) => query(supabaseAdmin.from("products").update({is_active:false}).eq("tenant_id",tenantId).eq("id",id).select().single());
export const replaceProductOptions = async (tenantId,productId,groups) => {
  await query(supabaseAdmin.from("product_option_groups").delete().eq("tenant_id",tenantId).eq("product_id",productId));
  for(let groupIndex=0;groupIndex<groups.length;groupIndex++){
    const group=groups[groupIndex];
    const saved=await query(supabaseAdmin.from("product_option_groups").insert({tenant_id:tenantId,product_id:productId,name:group.name,minimum_selections:group.minimumSelections,maximum_selections:group.maximumSelections,sort_order:groupIndex}).select().single());
    if(group.options.length)await query(supabaseAdmin.from("product_options").insert(group.options.map((option,index)=>({tenant_id:tenantId,group_id:saved.id,component_product_id:option.productId,name:option.name,price_delta:option.priceDelta,stock_quantity:option.stockQuantity,is_active:true,sort_order:index}))));
  }
  return findProduct(tenantId,productId);
};
export const listTemplates = (tenantId) => query(supabaseAdmin.from("pricing_templates").select("*,template_requirements(*,product_categories(id,name,is_active))").eq("tenant_id",tenantId).order("name"));
export const findTemplate = async (tenantId,id) => {const{data,error}=await supabaseAdmin.from("pricing_templates").select("*,template_requirements(*,product_categories(id,name,is_active))").eq("tenant_id",tenantId).eq("id",id).maybeSingle();if(error)throw error;return data};
export const saveTemplate = async (tenantId,id,values,requirements) => {
  let template;if(id)template=await query(supabaseAdmin.from("pricing_templates").update(values).eq("tenant_id",tenantId).eq("id",id).select().single());else template=await query(supabaseAdmin.from("pricing_templates").insert({tenant_id:tenantId,...values}).select().single());
  await query(supabaseAdmin.from("template_requirements").delete().eq("tenant_id",tenantId).eq("template_id",template.id));
  if(requirements.length)await query(supabaseAdmin.from("template_requirements").insert(requirements.map((item,index)=>({tenant_id:tenantId,template_id:template.id,category_id:item.categoryId,quantity:item.quantity,sort_order:index}))));
  return findTemplate(tenantId,template.id);
};
export const deactivateTemplate = (tenantId,id) => query(supabaseAdmin.from("pricing_templates").update({is_active:false}).eq("tenant_id",tenantId).eq("id",id).select().single());

export const getDailyMenu = async (tenantId, serviceDate) => {
  const branch=await getDefaultBranch(tenantId);
  const {data,error}=await supabaseAdmin.from("daily_menus")
    .select("*,daily_menu_items(*,products(*,product_categories(name),product_option_groups(*,product_options(*,component_product:products!product_options_component_product_id_fkey(id,name,is_active))))),daily_menu_option_stocks(*)")
    .eq("tenant_id",tenantId).eq("branch_id",branch.id).eq("service_date",serviceDate).maybeSingle();
  if(error)throw error;return data;
};
export const saveDailyMenu = async (tenantId,userId,serviceDate,items) => {
  const branch=await getDefaultBranch(tenantId);
  const menu=await query(supabaseAdmin.from("daily_menus").upsert({tenant_id:tenantId,branch_id:branch.id,service_date:serviceDate,status:"published",created_by:userId},{onConflict:"branch_id,service_date"}).select().single());
  const existingItems=await query(supabaseAdmin.from("daily_menu_items").select("product_id,stock_quantity,remaining_quantity,availability").eq("tenant_id",tenantId).eq("daily_menu_id",menu.id));
  const existingByProduct=new Map(existingItems.map(item=>[item.product_id,item]));
  await query(supabaseAdmin.from("daily_menu_items").delete().eq("tenant_id",tenantId).eq("daily_menu_id",menu.id));
  if(items.length)await query(supabaseAdmin.from("daily_menu_items").insert(items.map((item,index)=>{const previous=existingByProduct.get(item.productId);const unchanged=previous&&previous.stock_quantity===item.quantity;return{tenant_id:tenantId,daily_menu_id:menu.id,product_id:item.productId,stock_quantity:item.quantity,remaining_quantity:unchanged?previous.remaining_quantity:item.quantity,availability:unchanged?previous.availability:item.quantity===0?"sold_out":"available",sort_order:index}})));
  const existingStocks=await query(supabaseAdmin.from("daily_menu_option_stocks").select("*").eq("tenant_id",tenantId).eq("daily_menu_id",menu.id));
  const stockByOption=new Map(existingStocks.map(item=>[item.option_id,item]));const desired=items.flatMap(item=>item.optionStocks||[]);
  await query(supabaseAdmin.from("daily_menu_option_stocks").delete().eq("tenant_id",tenantId).eq("daily_menu_id",menu.id));
  if(desired.length)await query(supabaseAdmin.from("daily_menu_option_stocks").insert(desired.map(item=>{const previous=stockByOption.get(item.optionId),unchanged=previous&&previous.stock_quantity===item.quantity;return{tenant_id:tenantId,daily_menu_id:menu.id,option_id:item.optionId,stock_quantity:item.quantity,remaining_quantity:unchanged?previous.remaining_quantity:item.quantity}})));
  return getDailyMenu(tenantId,serviceDate);
};
export const updateDailyMenuItem = (tenantId,id,availability) => query(supabaseAdmin.from("daily_menu_items").update({availability}).eq("tenant_id",tenantId).eq("id",id).select().single());

export const listTables = async (tenantId) => query(supabaseAdmin.from("dining_tables").select("*,dining_areas(name)").eq("tenant_id",tenantId).order("name"));
export const createTable = async (tenantId, values) => { const branch=await getDefaultBranch(tenantId); return query(supabaseAdmin.from("dining_tables").insert({tenant_id:tenantId,branch_id:branch.id,...values}).select().single()); };
export const updateTable = (tenantId,id,values) => query(supabaseAdmin.from("dining_tables").update(values).eq("tenant_id",tenantId).eq("id",id).select().single());
export const findTable = async (tenantId,id) => { const {data,error}=await supabaseAdmin.from("dining_tables").select("*").eq("tenant_id",tenantId).eq("id",id).maybeSingle();if(error)throw error;return data; };

export const listOrders = (tenantId) => query(supabaseAdmin.from("orders").select("*,dining_tables(name),order_items(*),payments(method,amount),refunds(method,amount,reason,created_at)").eq("tenant_id",tenantId).order("created_at",{ascending:false}));
export const findOrder = async (tenantId,id) => { const {data,error}=await supabaseAdmin.from("orders").select("*,dining_tables(name),order_items(*),payments(method,amount),refunds(method,amount,reason,created_at)").eq("tenant_id",tenantId).eq("id",id).maybeSingle();if(error)throw error;return data; };
export const listOrdersInRange = (tenantId,from,to) => query(supabaseAdmin.from("orders").select("*,dining_tables(name),order_items(product_name,quantity,unit_price),payments(method,amount),refunds(method,amount,reason,created_at)").eq("tenant_id",tenantId).gte("created_at",from).lt("created_at",to).order("created_at",{ascending:false}));
export const createOrder = async (tenantId,userId,values,items=[]) => {
  const branch=await getDefaultBranch(tenantId);
  const subtotal=items.reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity),0);
  const serviceFee=Number(values.service_fee)||0;
  const order=await query(supabaseAdmin.from("orders").insert({tenant_id:tenantId,branch_id:branch.id,created_by:userId,...values,subtotal,total:subtotal+serviceFee}).select().single());
  if(items.length) await query(supabaseAdmin.from("order_items").insert(items.map(item=>{const{remaining_quantity,...orderItem}=item;return{tenant_id:tenantId,order_id:order.id,...orderItem}})));
  for(const item of items){
    if(item.remaining_quantity===null||item.remaining_quantity===undefined)continue;
    const remaining=item.remaining_quantity-Number(item.quantity);
    const {data,error}=await supabaseAdmin.from("daily_menu_items").update({remaining_quantity:remaining,availability:remaining===0?"sold_out":"available"}).eq("tenant_id",tenantId).eq("id",item.daily_menu_item_id).gte("remaining_quantity",Number(item.quantity)).select("id").maybeSingle();
    if(error)throw error;if(!data)throw new Error(`No hay suficientes unidades de ${item.product_name}`);
  }
  await reserveOptionStocks(tenantId,items);
  await reservePreparationStocks(tenantId,items);
  if(values.table_id) await updateTable(tenantId,values.table_id,{status:"occupied"});
  return (await listOrders(tenantId)).find(item=>item.id===order.id);
};
export const updateOrder = (tenantId,id,values) => query(supabaseAdmin.from("orders").update(values).eq("tenant_id",tenantId).eq("id",id).select().single());
const restoreControlledItems = async (tenantId,items) => {
  for(const item of items||[]){
    if(!item.daily_menu_item_id)continue;
    const {data:daily,error}=await supabaseAdmin.from("daily_menu_items").select("stock_quantity,remaining_quantity").eq("tenant_id",tenantId).eq("id",item.daily_menu_item_id).maybeSingle();if(error)throw error;
    if(!daily||daily.remaining_quantity===null)continue;
    const restored=Math.min(Number(daily.stock_quantity),Number(daily.remaining_quantity)+Number(item.quantity));
    await query(supabaseAdmin.from("daily_menu_items").update({remaining_quantity:restored,availability:restored>0?"available":"sold_out"}).eq("tenant_id",tenantId).eq("id",item.daily_menu_item_id));
  }
};
const reserveOptionStocks=async(tenantId,items)=>{
  for(const item of items||[])for(const selection of item.selections||[]){
    if(selection.dailyStockId===null||selection.dailyStockId===undefined)continue;
    const amount=Number(item.quantity);const {data:option,error:readError}=await supabaseAdmin.from("daily_menu_option_stocks").select("remaining_quantity").eq("tenant_id",tenantId).eq("id",selection.dailyStockId).single();if(readError)throw readError;
    const remaining=Number(option.remaining_quantity)-amount;if(remaining<0)throw new Error(`No hay suficientes unidades de ${selection.name}`);
    const {data,error}=await supabaseAdmin.from("daily_menu_option_stocks").update({remaining_quantity:remaining}).eq("tenant_id",tenantId).eq("id",selection.dailyStockId).eq("remaining_quantity",option.remaining_quantity).select("id").maybeSingle();if(error)throw error;if(!data)throw new Error(`Las existencias de ${selection.name} cambiaron; intenta nuevamente`);
  }
};
const restoreOptionStocks=async(tenantId,items)=>{
  for(const item of items||[])for(const selection of item.selections||[]){
    if(selection.dailyStockId===null||selection.dailyStockId===undefined)continue;
    const {data:option,error}=await supabaseAdmin.from("daily_menu_option_stocks").select("stock_quantity,remaining_quantity").eq("tenant_id",tenantId).eq("id",selection.dailyStockId).maybeSingle();if(error)throw error;if(!option)continue;
    await query(supabaseAdmin.from("daily_menu_option_stocks").update({remaining_quantity:Math.min(Number(option.stock_quantity),Number(option.remaining_quantity)+Number(item.quantity))}).eq("tenant_id",tenantId).eq("id",selection.dailyStockId));
  }
};
const reservePreparationStocks=async(tenantId,items)=>{
  const counts=new Map();for(const item of items||[])if(item.line_type==="preparation")for(const selection of item.selections||[]){if(!selection.dailyMenuItemId)continue;counts.set(selection.dailyMenuItemId,{name:selection.name,count:Number(counts.get(selection.dailyMenuItemId)?.count||0)+1})}
  for(const[id,value]of counts){const{data:daily,error}=await supabaseAdmin.from("daily_menu_items").select("remaining_quantity").eq("tenant_id",tenantId).eq("id",id).single();if(error)throw error;if(daily.remaining_quantity===null)continue;const remaining=Number(daily.remaining_quantity)-value.count;if(remaining<0)throw new Error(`No hay suficientes unidades de ${value.name}`);const{data,error:updateError}=await supabaseAdmin.from("daily_menu_items").update({remaining_quantity:remaining,availability:remaining===0?"sold_out":"available"}).eq("tenant_id",tenantId).eq("id",id).eq("remaining_quantity",daily.remaining_quantity).select("id").maybeSingle();if(updateError)throw updateError;if(!data)throw new Error(`Las existencias de ${value.name} cambiaron; intenta nuevamente`)}
};
const restorePreparationStocks=async(tenantId,items)=>{
  const counts=new Map();for(const item of items||[])if(item.line_type==="preparation")for(const selection of item.selections||[]){if(selection.dailyMenuItemId)counts.set(selection.dailyMenuItemId,Number(counts.get(selection.dailyMenuItemId)||0)+1)}
  for(const[id,count]of counts){const{data:daily,error}=await supabaseAdmin.from("daily_menu_items").select("stock_quantity,remaining_quantity").eq("tenant_id",tenantId).eq("id",id).maybeSingle();if(error)throw error;if(!daily||daily.remaining_quantity===null)continue;const restored=Math.min(Number(daily.stock_quantity),Number(daily.remaining_quantity)+count);await query(supabaseAdmin.from("daily_menu_items").update({remaining_quantity:restored,availability:restored>0?"available":"sold_out"}).eq("tenant_id",tenantId).eq("id",id))}
};
export const editOrder = async ({tenantId,order,values,items}) => {
  await restoreControlledItems(tenantId,order.order_items);
  await restoreOptionStocks(tenantId,order.order_items);
  await restorePreparationStocks(tenantId,order.order_items);
  await query(supabaseAdmin.from("order_items").delete().eq("tenant_id",tenantId).eq("order_id",order.id));
  if(items.length)await query(supabaseAdmin.from("order_items").insert(items.map(item=>{const{remaining_quantity,...orderItem}=item;return{tenant_id:tenantId,order_id:order.id,...orderItem}})));
  for(const item of items){
    if(item.remaining_quantity===null||item.remaining_quantity===undefined)continue;
    const {data:daily,error:readError}=await supabaseAdmin.from("daily_menu_items").select("remaining_quantity").eq("tenant_id",tenantId).eq("id",item.daily_menu_item_id).single();if(readError)throw readError;
    const remaining=Number(daily.remaining_quantity)-Number(item.quantity);if(remaining<0)throw new Error(`No hay suficientes unidades de ${item.product_name}`);
    await query(supabaseAdmin.from("daily_menu_items").update({remaining_quantity:remaining,availability:remaining===0?"sold_out":"available"}).eq("tenant_id",tenantId).eq("id",item.daily_menu_item_id));
  }
  await reserveOptionStocks(tenantId,items);
  await reservePreparationStocks(tenantId,items);
  if(order.table_id&&order.table_id!==values.table_id)await updateTable(tenantId,order.table_id,{status:"free"});
  if(values.table_id&&order.table_id!==values.table_id)await updateTable(tenantId,values.table_id,{status:"occupied"});
  const subtotal=items.reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity),0);
  await updateOrder(tenantId,order.id,{...values,subtotal,total:subtotal+Number(values.service_fee||0),status:"new"});
  return findOrder(tenantId,order.id);
};
export const payOrder = async ({tenantId,order,userId,cashSessionId,payments}) => {
  await query(supabaseAdmin.from("payments").insert(payments.map(payment=>({tenant_id:tenantId,order_id:order.id,cash_session_id:cashSessionId,received_by:userId,method:payment.method,amount:payment.amount}))));
  const paid=await updateOrder(tenantId,order.id,{status:"paid"});
  if(order.table_id)await updateTable(tenantId,order.table_id,{status:"free"});
  return paid;
};
export const cancelOrder = async ({tenantId,order}) => {
  await restoreControlledItems(tenantId,order.order_items);
  await restoreOptionStocks(tenantId,order.order_items);
  await restorePreparationStocks(tenantId,order.order_items);
  const cancelled=await updateOrder(tenantId,order.id,{status:"cancelled"});
  if(order.table_id)await updateTable(tenantId,order.table_id,{status:"free"});
  return cancelled;
};

export const refundOrder = async ({tenantId,order,userId,cashSessionId,reason}) => {
  const payments=order.payments||[];
  await query(supabaseAdmin.from("refunds").insert(payments.map(payment=>({tenant_id:tenantId,order_id:order.id,cash_session_id:cashSessionId,created_by:userId,method:payment.method,amount:Number(payment.amount),reason}))));
  return updateOrder(tenantId,order.id,{status:"refunded"});
};

export const currentCashSession = async (tenantId) => { const {data,error}=await supabaseAdmin.from("cash_sessions").select("*,cash_movements(*),payments(*),refunds(*)").eq("tenant_id",tenantId).eq("status","open").maybeSingle(); if(error)throw error; return data; };
export const listClosedCashSessions = (tenantId) => query(supabaseAdmin.from("cash_sessions").select("*,cash_movements(*),payments(*),refunds(*)").eq("tenant_id",tenantId).eq("status","closed").order("closed_at",{ascending:false}).limit(50));
export const openCashSession = async (tenantId,userId,openingAmount,notes) => { const branch=await getDefaultBranch(tenantId); return query(supabaseAdmin.from("cash_sessions").insert({tenant_id:tenantId,branch_id:branch.id,opened_by:userId,opening_amount:openingAmount,notes}).select().single()); };
export const addCashMovement = (tenantId,userId,sessionId,values) => query(supabaseAdmin.from("cash_movements").insert({tenant_id:tenantId,created_by:userId,cash_session_id:sessionId,...values}).select().single());
export const listCashMovementsInRange = (tenantId,from,to) => query(supabaseAdmin.from("cash_movements").select("*,cash_sessions(branch_id)").eq("tenant_id",tenantId).gte("created_at",from).lt("created_at",to).order("created_at",{ascending:false}));
export const listRefundsInRange = (tenantId,from,to) => query(supabaseAdmin.from("refunds").select("*,orders(order_number,total)").eq("tenant_id",tenantId).gte("created_at",from).lt("created_at",to).order("created_at",{ascending:false}));
export const closeCashSession = (tenantId,id,userId,closingAmount) => query(supabaseAdmin.from("cash_sessions").update({status:"closed",closed_by:userId,closing_amount:closingAmount,closed_at:new Date().toISOString()}).eq("tenant_id",tenantId).eq("id",id).select().single());
