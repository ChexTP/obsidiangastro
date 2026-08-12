import * as model from "../models/operations.model.js";
const fail=(res,message,error)=>res.status(500).json({message,error:error.message});
export const getCatalog=async(req,res)=>{try{res.json({categories:await model.listCategories(req.tenantId),products:await model.listProducts(req.tenantId)})}catch(e){fail(res,"Error al consultar el menú",e)}};
export const postCategory=async(req,res)=>{try{if(!req.body.name?.trim())return res.status(400).json({message:"El nombre es obligatorio"});res.status(201).json(await model.createCategory(req.tenantId,{name:req.body.name.trim()}))}catch(e){fail(res,"Error al crear la categoría",e)}};
export const patchCategory=async(req,res)=>{try{const name=req.body.name?.trim();if(!name)return res.status(400).json({message:"El nombre es obligatorio"});res.json(await model.updateCategory(req.tenantId,req.params.id,{name}))}catch(e){fail(res,"Error al editar la categoría",e)}};
export const deleteCategory=async(req,res)=>{try{const count=await model.categoryProductCount(req.tenantId,req.params.id);if(count>0)return res.status(409).json({message:"Mueve o retira los productos activos antes de eliminar esta categoría"});res.json({message:"Categoría retirada",data:await model.deactivateCategory(req.tenantId,req.params.id)})}catch(e){fail(res,"Error al retirar la categoría",e)}};
const productValues=(body)=>({name:body.name?.trim(),category_id:body.categoryId||null,price:Number(body.price),template_surcharge:Number(body.templateSurcharge||0),description:body.description?.trim()||null,product_type:"simple",is_active:body.isActive!==false});
export const postProduct=async(req,res)=>{try{const values=productValues(req.body);if(!values.name||!Number.isFinite(values.price)||values.price<0||!Number.isFinite(values.template_surcharge)||values.template_surcharge<0)return res.status(400).json({message:"Nombre, precio y adicional válidos son obligatorios"});res.status(201).json(await model.createProduct(req.tenantId,values))}catch(e){fail(res,"Error al crear el producto",e)}};
export const patchProduct=async(req,res)=>{try{const values=productValues(req.body);if(!values.name||!Number.isFinite(values.price)||values.price<0||!Number.isFinite(values.template_surcharge)||values.template_surcharge<0)return res.status(400).json({message:"Nombre, precio y adicional válidos son obligatorios"});res.json(await model.updateProduct(req.tenantId,req.params.id,values))}catch(e){fail(res,"Error al actualizar el producto",e)}};
export const deleteProduct=async(req,res)=>{try{const product=await model.findProduct(req.tenantId,req.params.id);if(!product)return res.status(404).json({message:"Producto no encontrado"});res.json({message:"Producto retirado del menú",data:await model.deactivateProduct(req.tenantId,req.params.id)})}catch(e){fail(res,"Error al retirar el producto",e)}};
export const putProductOptions=async(req,res)=>{try{
  const product=await model.findProduct(req.tenantId,req.params.id);if(!product)return res.status(404).json({message:"Producto no encontrado"});
  const received=Array.isArray(req.body.groups)?req.body.groups:[];if(product.product_type==="composite"&&!received.length)return res.status(400).json({message:"Un plato compuesto necesita al menos un grupo"});
  const catalog=await model.listProducts(req.tenantId);const components=new Map(catalog.filter(item=>item.id!==product.id&&item.product_type==="simple"&&item.is_active).map(item=>[item.id,item]));
  const groups=[];for(const group of received){const name=group.name?.trim();const minimum=Number(group.minimumSelections);const maximum=Number(group.maximumSelections);if(!name||!Number.isInteger(minimum)||!Number.isInteger(maximum)||minimum<0||maximum<1||minimum>maximum)return res.status(400).json({message:"Revisa el nombre y la cantidad permitida de cada grupo"});const options=[];for(const option of group.options||[]){const component=components.get(option.productId);const priceDelta=Number(option.priceDelta||0);const stock=option.stockQuantity===""||option.stockQuantity===null||option.stockQuantity===undefined?null:Number(option.stockQuantity);if(!component||!Number.isFinite(priceDelta)||priceDelta<0||(stock!==null&&(!Number.isInteger(stock)||stock<0)))return res.status(400).json({message:`Selecciona una comida válida en ${name}`});options.push({productId:component.id,name:component.name,priceDelta,stockQuantity:stock})}if(options.length<maximum)return res.status(400).json({message:`El grupo ${name} no tiene suficientes opciones`});groups.push({name,minimumSelections:minimum,maximumSelections:maximum,options})}
  res.json({message:"Composición actualizada",data:await model.replaceProductOptions(req.tenantId,req.params.id,groups)});
}catch(e){fail(res,"Error al configurar el plato compuesto",e)}};
export const getTemplates=async(req,res)=>{try{res.json(await model.listTemplates(req.tenantId))}catch(e){fail(res,"Error al consultar las plantillas",e)}};
const normalizeTemplate=async(req,res)=>{
  const name=req.body.name?.trim(),basePrice=Number(req.body.basePrice),received=Array.isArray(req.body.requirements)?req.body.requirements:[];if(!name||!Number.isFinite(basePrice)||basePrice<0||!received.length){res.status(400).json({message:"Nombre, precio y al menos una categoría son obligatorios"});return null}
  const categories=await model.listCategories(req.tenantId),allowed=new Set(categories.filter(item=>item.is_active).map(item=>item.id)),seen=new Set(),requirements=[];for(const item of received){const quantity=Number(item.quantity);if(!allowed.has(item.categoryId)||seen.has(item.categoryId)||!Number.isInteger(quantity)||quantity<1){res.status(400).json({message:"Las categorías y cantidades de la plantilla no son válidas"});return null}seen.add(item.categoryId);requirements.push({categoryId:item.categoryId,quantity})}
  const signature=requirements.map(item=>`${item.categoryId}:${item.quantity}`).sort().join("|"),templates=await model.listTemplates(req.tenantId);const duplicate=templates.find(template=>template.id!==req.params.id&&template.is_active&&template.template_requirements.map(item=>`${item.category_id}:${item.quantity}`).sort().join("|")===signature);if(duplicate){res.status(409).json({message:`Ya existe una plantilla con la misma estructura: ${duplicate.name}`});return null}
  return{values:{name,base_price:basePrice,description:req.body.description?.trim()||null,is_active:req.body.isActive!==false},requirements};
};
export const postTemplate=async(req,res)=>{try{const normalized=await normalizeTemplate(req,res);if(!normalized)return;res.status(201).json(await model.saveTemplate(req.tenantId,null,normalized.values,normalized.requirements))}catch(e){fail(res,"Error al crear la plantilla",e)}};
export const putTemplate=async(req,res)=>{try{const normalized=await normalizeTemplate(req,res);if(!normalized)return;res.json(await model.saveTemplate(req.tenantId,req.params.id,normalized.values,normalized.requirements))}catch(e){fail(res,"Error al editar la plantilla",e)}};
export const deleteTemplate=async(req,res)=>{try{res.json({message:"Plantilla retirada",data:await model.deactivateTemplate(req.tenantId,req.params.id)})}catch(e){fail(res,"Error al retirar la plantilla",e)}};
const validDate=(value)=>/^\d{4}-\d{2}-\d{2}$/.test(value||"");
const prepareRequestedItem=(requested,product,previousQuantity=0,previousOptionQuantities=new Map())=>{
  const quantity=Number(requested.quantity);if(!Number.isInteger(quantity)||quantity<=0)return null;
  const capacity=product.remainingQuantity===null?null:Number(product.remainingQuantity)+Number(previousQuantity||0);if(capacity!==null&&quantity>capacity)return null;
  const groups=(product.product_option_groups||[]).sort((a,b)=>a.sort_order-b.sort_order);const selectedIds=Array.isArray(requested.optionIds)?requested.optionIds:[];const selections=[];let extra=0;
  for(const group of groups){const available=(group.product_options||[]).filter(option=>option.is_active&&option.component_product?.is_active);const chosen=available.filter(option=>selectedIds.includes(option.id));if(chosen.length<group.minimum_selections||chosen.length>group.maximum_selections)return null;for(const option of chosen){const dailyStock=product.dailyOptionStocks?.get(option.id),optionCapacity=dailyStock?.remaining_quantity===null||dailyStock?.remaining_quantity===undefined?null:Number(dailyStock.remaining_quantity)+Number(previousOptionQuantities.get(option.id)||0);if(optionCapacity!==null&&optionCapacity<quantity)return null;selections.push({optionId:option.id,componentProductId:option.component_product_id,group:group.name,name:option.name,priceDelta:Number(option.price_delta),dailyStockId:dailyStock?.id||null});extra+=Number(option.price_delta)}}
  if(product.product_type==="composite"&&groups.length===0)return null;
  return{product_id:product.id,template_id:null,line_type:"product",product_name:product.name,unit_price:Number(product.effectivePrice)+extra,quantity,notes:requested.notes||null,selections,daily_menu_item_id:product.dailyMenuItemId,remaining_quantity:product.remainingQuantity};
};
const buildPreparation=(ingredientIds,productsById,templates,previousIngredients=new Map())=>{
  if(!Array.isArray(ingredientIds)||!ingredientIds.length)return null;const ingredients=ingredientIds.map(id=>productsById.get(id));if(ingredients.some(item=>!item))return null;
  const requestedCounts=new Map();for(const product of ingredients)requestedCounts.set(product.id,Number(requestedCounts.get(product.id)||0)+1);
  for(const [id,count]of requestedCounts){const product=productsById.get(id),capacity=product.remainingQuantity===null?null:Number(product.remainingQuantity)+Number(previousIngredients.get(id)||0);if(capacity!==null&&count>capacity)return null}
  const activeTemplates=templates.filter(template=>template.is_active);const matches=activeTemplates.filter(template=>(template.template_requirements||[]).every(requirement=>ingredients.filter(product=>product.category_id===requirement.category_id).length>=Number(requirement.quantity))).sort((a,b)=>b.template_requirements.reduce((sum,item)=>sum+Number(item.quantity),0)-a.template_requirements.reduce((sum,item)=>sum+Number(item.quantity),0));
  const template=matches[0]||null,included=new Set();if(template)for(const requirement of [...template.template_requirements].sort((a,b)=>a.sort_order-b.sort_order)){let remaining=Number(requirement.quantity);ingredients.forEach((product,index)=>{if(remaining>0&&!included.has(index)&&product.category_id===requirement.category_id){included.add(index);remaining--}})}
  let total=template?Number(template.base_price):0;const selections=ingredients.map((product,index)=>{const isIncluded=included.has(index),individualPrice=Number(product.effectivePrice??product.price);if(template&&isIncluded)total+=Number(product.template_surcharge||0);else total+=individualPrice;return{productId:product.id,dailyMenuItemId:product.dailyMenuItemId,group:product.product_categories?.name||"Sin categoría",name:product.name,included:isIncluded,individualPrice,templateSurcharge:Number(product.template_surcharge||0)}});
  return{product_id:null,template_id:template?.id||null,line_type:"preparation",product_name:template?.name||"Selección individual",unit_price:total,quantity:1,notes:null,selections,daily_menu_item_id:null,remaining_quantity:null};
};
const composeOrderItems=(requestedItems,requestedPreparations,productsById,templates,previous=new Map(),previousOptions=new Map(),previousIngredients=new Map())=>{
  const pool=[];const direct=[];
  for(const preparation of requestedPreparations)pool.push(...preparation.ingredientIds);
  for(const requested of requestedItems){const product=productsById.get(requested.productId),quantity=Number(requested.quantity);if(!product||!Number.isInteger(quantity)||quantity<=0)return null;const canCompose=product.product_type==="simple"&&!(requested.optionIds||[]).length&&!requested.notes;if(canCompose){for(let i=0;i<quantity;i++)pool.push(product.id)}else direct.push(requested)}
  const totalCounts=new Map();for(const id of pool)totalCounts.set(id,Number(totalCounts.get(id)||0)+1);for(const[id,count]of totalCounts){const product=productsById.get(id);if(!product)return null;const capacity=product.remainingQuantity===null?null:Number(product.remainingQuantity)+Number(previous.get(id)||0)+Number(previousIngredients.get(id)||0);if(capacity!==null&&count>capacity)return null}
  const available=pool.map(id=>productsById.get(id));const sortedTemplates=templates.filter(template=>template.is_active).sort((a,b)=>b.template_requirements.reduce((sum,item)=>sum+Number(item.quantity),0)-a.template_requirements.reduce((sum,item)=>sum+Number(item.quantity),0));const preparationLines=[];
  while(true){const template=sortedTemplates.find(candidate=>(candidate.template_requirements||[]).every(requirement=>available.filter(product=>product.category_id===requirement.category_id).length>=Number(requirement.quantity)));if(!template)break;const group=[];for(const requirement of [...template.template_requirements].sort((a,b)=>a.sort_order-b.sort_order)){let remaining=Number(requirement.quantity);for(let index=available.length-1;index>=0&&remaining>0;index--){if(available[index].category_id===requirement.category_id){group.push(available[index].id);available.splice(index,1);remaining--}}}const line=buildPreparation(group,productsById,templates,previousIngredients);if(!line)return null;preparationLines.push(line)}
  const leftoverCounts=new Map();for(const product of available)leftoverCounts.set(product.id,Number(leftoverCounts.get(product.id)||0)+1);const productLines=[...direct.map(item=>prepareRequestedItem(item,productsById.get(item.productId),previous.get(item.productId),previousOptions)),...[...leftoverCounts].map(([productId,quantity])=>prepareRequestedItem({productId,quantity},productsById.get(productId),previous.get(productId),previousOptions))];
  return productLines.some(item=>!item)?null:[...productLines,...preparationLines];
};
export const getDailyMenu=async(req,res)=>{try{const date=req.query.date;if(!validDate(date))return res.status(400).json({message:"La fecha debe usar el formato AAAA-MM-DD"});res.json({date,menu:await model.getDailyMenu(req.tenantId,date)})}catch(e){fail(res,"Error al consultar el menú del día",e)}};
export const putDailyMenu=async(req,res)=>{try{const{date,items}=req.body;if(!validDate(date)||!Array.isArray(items))return res.status(400).json({message:"Fecha y productos son obligatorios"});const normalized=[];const seen=new Set();for(const item of items){if(!item.productId||seen.has(item.productId))continue;seen.add(item.productId);const quantity=item.quantity===""||item.quantity===null||item.quantity===undefined?null:Number(item.quantity);if(quantity!==null&&(!Number.isInteger(quantity)||quantity<0))return res.status(400).json({message:"Las cantidades deben ser números enteros positivos"});const optionStocks=[];for(const option of item.optionStocks||[]){const optionQuantity=option.quantity===""||option.quantity===null||option.quantity===undefined?null:Number(option.quantity);if(!option.optionId||(optionQuantity!==null&&(!Number.isInteger(optionQuantity)||optionQuantity<0)))return res.status(400).json({message:"Las existencias de los componentes deben ser enteros positivos"});optionStocks.push({optionId:option.optionId,quantity:optionQuantity})}normalized.push({productId:item.productId,quantity,optionStocks})}const catalog=await model.listProducts(req.tenantId);const allowed=new Map(catalog.filter(p=>p.is_active).map(p=>[p.id,p]));if(normalized.some(item=>!allowed.has(item.productId)))return res.status(400).json({message:"Uno de los productos no existe o está inactivo"});for(const item of normalized){const validOptions=new Set((allowed.get(item.productId)?.product_option_groups||[]).flatMap(group=>group.product_options||[]).map(option=>option.id));if(item.optionStocks.some(stock=>!validOptions.has(stock.optionId)))return res.status(400).json({message:"Una opción no pertenece al combo seleccionado"})}res.json({message:"Menú del día actualizado",menu:await model.saveDailyMenu(req.tenantId,req.user.id,date,normalized)})}catch(e){fail(res,"Error al guardar el menú del día",e)}};
export const patchDailyMenuItem=async(req,res)=>{try{if(!["available","sold_out"].includes(req.body.availability))return res.status(400).json({message:"Disponibilidad inválida"});res.json(await model.updateDailyMenuItem(req.tenantId,req.params.id,req.body.availability))}catch(e){fail(res,"Error al actualizar disponibilidad",e)}};
export const getTables=async(req,res)=>{try{res.json(await model.listTables(req.tenantId))}catch(e){fail(res,"Error al consultar mesas",e)}};
export const postTable=async(req,res)=>{try{if(!req.body.name?.trim())return res.status(400).json({message:"El nombre es obligatorio"});res.status(201).json(await model.createTable(req.tenantId,{name:req.body.name.trim(),seats:Number(req.body.seats)||4}))}catch(e){fail(res,"Error al crear la mesa",e)}};
export const patchTable=async(req,res)=>{try{res.json(await model.updateTable(req.tenantId,req.params.id,req.body))}catch(e){fail(res,"Error al actualizar la mesa",e)}};
export const getOrders=async(req,res)=>{try{res.json(await model.listOrders(req.tenantId))}catch(e){fail(res,"Error al consultar pedidos",e)}};
export const getOrder=async(req,res)=>{try{const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});res.json(order)}catch(e){fail(res,"Error al consultar el pedido",e)}};
export const postOrder=async(req,res)=>{try{
  const serviceType=req.body.serviceType||"table";
  if(!["table","takeaway","delivery"].includes(serviceType))return res.status(400).json({message:"Tipo de servicio inválido"});
  if(serviceType==="table"){
    if(!req.body.tableId)return res.status(400).json({message:"Selecciona una mesa para continuar"});
    const table=await model.findTable(req.tenantId,req.body.tableId);
    if(!table||table.status!=="free")return res.status(409).json({message:"La mesa seleccionada ya no está disponible"});
  }
  const requestedItems=Array.isArray(req.body.items)?req.body.items.filter(item=>Number(item.quantity)>0):[],requestedPreparations=Array.isArray(req.body.preparations)?req.body.preparations.filter(item=>Array.isArray(item.ingredientIds)&&item.ingredientIds.length):[];
  if(!requestedItems.length&&!requestedPreparations.length)return res.status(400).json({message:"El pedido debe incluir al menos un producto"});
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const dailyMenu=await model.getDailyMenu(req.tenantId,today);
  if(!dailyMenu||dailyMenu.status!=="published")return res.status(409).json({message:"No hay un menú publicado para hoy"});
  const dailyStocks=new Map((dailyMenu.daily_menu_option_stocks||[]).map(stock=>[stock.option_id,stock]));const byId=new Map(dailyMenu.daily_menu_items.filter(item=>item.availability==="available"&&item.products?.is_active).map(item=>[item.product_id,{...item.products,dailyMenuItemId:item.id,remainingQuantity:item.remaining_quantity,effectivePrice:item.price_override??item.products.price,dailyOptionStocks:dailyStocks}]));
  const templates=await model.listTemplates(req.tenantId);const items=composeOrderItems(requestedItems,requestedPreparations,byId,templates);
  if(!items)return res.status(400).json({message:"Completa las opciones del combo y revisa las existencias disponibles"});
  const serviceFee=serviceType==="table"?0:Number(req.body.serviceFee||0);
  if(!Number.isFinite(serviceFee)||serviceFee<0)return res.status(400).json({message:"El costo adicional no es válido"});
  res.status(201).json(await model.createOrder(req.tenantId,req.user.id,{service_type:serviceType,customer_name:req.body.customerName||null,table_id:serviceType==="table"?req.body.tableId:null,notes:req.body.notes||null,service_fee:serviceFee},items));
}catch(e){fail(res,"Error al crear el pedido",e)}};
export const putOrder=async(req,res)=>{try{
  const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});
  if(["paid","cancelled","refunded"].includes(order.status))return res.status(409).json({message:"Solo se pueden editar pedidos pendientes de cobro"});
  const serviceType=req.body.serviceType;if(!["table","takeaway","delivery"].includes(serviceType))return res.status(400).json({message:"Tipo de servicio inválido"});
  const tableId=serviceType==="table"?req.body.tableId:null;
  if(serviceType==="table"){
    if(!tableId)return res.status(400).json({message:"Selecciona una mesa"});
    const table=await model.findTable(req.tenantId,tableId);if(!table||((table.id!==order.table_id)&&table.status!=="free"))return res.status(409).json({message:"La mesa seleccionada no está disponible"});
  }
  const requested=Array.isArray(req.body.items)?req.body.items.filter(item=>Number(item.quantity)>0):[],requestedPreparations=Array.isArray(req.body.preparations)?req.body.preparations.filter(item=>Array.isArray(item.ingredientIds)&&item.ingredientIds.length):[];if(!requested.length&&!requestedPreparations.length)return res.status(400).json({message:"El pedido debe conservar al menos un producto"});
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const dailyMenu=await model.getDailyMenu(req.tenantId,today);if(!dailyMenu)return res.status(409).json({message:"No hay menú para hoy"});
  const previous=new Map((order.order_items||[]).map(item=>[item.product_id,Number(item.quantity)]));
  const previousOptions=new Map();for(const item of order.order_items||[])for(const selection of item.selections||[])previousOptions.set(selection.optionId,Number(previousOptions.get(selection.optionId)||0)+Number(item.quantity));
  const previousIngredients=new Map();for(const item of order.order_items||[])if(item.line_type==="preparation")for(const selection of item.selections||[])previousIngredients.set(selection.productId,Number(previousIngredients.get(selection.productId)||0)+1);
  const dailyStocks=new Map((dailyMenu.daily_menu_option_stocks||[]).map(stock=>[stock.option_id,stock]));const byId=new Map(dailyMenu.daily_menu_items.filter(item=>item.products?.is_active).map(item=>[item.product_id,{...item.products,dailyMenuItemId:item.id,remainingQuantity:item.remaining_quantity,effectivePrice:item.price_override??item.products.price,dailyOptionStocks:dailyStocks}]));
  const templates=await model.listTemplates(req.tenantId);const items=composeOrderItems(requested,requestedPreparations,byId,templates,previous,previousOptions,previousIngredients);
  if(!items)return res.status(400).json({message:"Completa las opciones del combo y revisa las existencias disponibles"});
  const serviceFee=serviceType==="table"?0:Number(req.body.serviceFee||0);if(!Number.isFinite(serviceFee)||serviceFee<0)return res.status(400).json({message:"El costo adicional no es válido"});
  res.json({message:"Pedido actualizado",data:await model.editOrder({tenantId:req.tenantId,order,values:{service_type:serviceType,table_id:tableId,customer_name:req.body.customerName||null,notes:req.body.notes||null,service_fee:serviceFee},items})});
}catch(e){fail(res,"Error al editar el pedido",e)}};
export const patchOrder=async(req,res)=>{try{const next=req.body.status;if(!["new","preparing","ready","delivered"].includes(next))return res.status(400).json({message:"Estado de pedido inválido"});const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});if(["paid","cancelled"].includes(order.status))return res.status(409).json({message:"El pedido ya está cerrado"});const transitions={new:["new","preparing"],preparing:["preparing","ready"],ready:["ready","delivered"],delivered:["delivered"]};if(!transitions[order.status]?.includes(next))return res.status(409).json({message:"Ese cambio de estado no corresponde al flujo del pedido"});res.json(await model.updateOrder(req.tenantId,req.params.id,{status:next}))}catch(e){fail(res,"Error al actualizar el pedido",e)}};
export const postOrderPayment=async(req,res)=>{try{
  const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});
  if(order.status==="paid")return res.status(409).json({message:"El pedido ya está pagado"});if(["cancelled","refunded"].includes(order.status))return res.status(409).json({message:"Un pedido cerrado no se puede cobrar"});
  const cashSession=await model.currentCashSession(req.tenantId);if(!cashSession)return res.status(409).json({message:"Debes abrir la caja antes de cobrar"});
  const received=Array.isArray(req.body.payments)?req.body.payments:[];if(!received.length)return res.status(400).json({message:"Selecciona un medio de pago"});
  const payments=received.map(payment=>({method:payment.method,amount:Number(payment.amount)}));
  if(payments.some(payment=>!["cash","card","transfer"].includes(payment.method)||!Number.isFinite(payment.amount)||payment.amount<=0))return res.status(400).json({message:"Los medios y valores de pago no son válidos"});
  const paidTotal=payments.reduce((sum,payment)=>sum+payment.amount,0);if(Math.abs(paidTotal-Number(order.total))>0.01)return res.status(400).json({message:`Los pagos deben sumar exactamente ${Number(order.total).toLocaleString("es-CO")}`});
  const result=await model.payOrder({tenantId:req.tenantId,order,userId:req.user.id,cashSessionId:cashSession.id,payments});res.json({message:"Pedido pagado correctamente",data:result});
}catch(e){fail(res,"Error al cobrar el pedido",e)}};
export const postOrderCancellation=async(req,res)=>{try{const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});if(["paid","refunded"].includes(order.status))return res.status(409).json({message:"Un pedido pagado o devuelto no se puede cancelar"});if(order.status==="cancelled")return res.status(409).json({message:"El pedido ya está cancelado"});res.json({message:"Pedido cancelado correctamente",data:await model.cancelOrder({tenantId:req.tenantId,order})})}catch(e){fail(res,"Error al cancelar el pedido",e)}};
export const postOrderRefund=async(req,res)=>{try{const order=await model.findOrder(req.tenantId,req.params.id);if(!order)return res.status(404).json({message:"Pedido no encontrado"});if(order.status!=="paid")return res.status(409).json({message:"Solo se pueden devolver pedidos pagados"});const reason=req.body.reason?.trim();if(!reason||reason.length<3)return res.status(400).json({message:"Indica el motivo de la devolución"});const cashSession=await model.currentCashSession(req.tenantId);if(!cashSession)return res.status(409).json({message:"Debes abrir una caja para registrar la devolución"});res.json({message:"Devolución registrada",data:await model.refundOrder({tenantId:req.tenantId,order,userId:req.user.id,cashSessionId:cashSession.id,reason})})}catch(e){fail(res,"Error al registrar la devolución",e)}};
export const getCash=async(req,res)=>{try{res.json({session:await model.currentCashSession(req.tenantId)})}catch(e){fail(res,"Error al consultar caja",e)}};
export const getCashHistory=async(req,res)=>{try{res.json({sessions:await model.listClosedCashSessions(req.tenantId)})}catch(e){fail(res,"Error al consultar historial de cajas",e)}};
export const getCashProductSales=async(req,res)=>{try{
  const session=await model.currentCashSession(req.tenantId);
  if(!session)return res.json({session:null,products:[]});
  const [orders,products]=await Promise.all([model.listPaidOrderItemsForCashSession(req.tenantId,session.id),model.listProducts(req.tenantId)]);
  const quantities=new Map();
  orders.flatMap(order=>order.order_items||[]).forEach(item=>{
    const quantity=Number(item.quantity)||0;
    if(item.product_id)quantities.set(item.product_id,(quantities.get(item.product_id)||0)+quantity);
    const selections=Array.isArray(item.selections)?item.selections:[];
    selections.forEach(selection=>{const productId=selection.productId||selection.componentProductId;if(productId)quantities.set(productId,(quantities.get(productId)||0)+quantity)});
  });
  res.json({session:{id:session.id,openedAt:session.opened_at},products:products.filter(product=>product.is_active).map(product=>({id:product.id,name:product.name,category:product.product_categories?.name||"Sin categoría",quantity:quantities.get(product.id)||0}))});
}catch(e){fail(res,"Error al consultar unidades vendidas",e)}};
export const postCashOpen=async(req,res)=>{try{if(await model.currentCashSession(req.tenantId))return res.status(409).json({message:"Ya existe una caja abierta"});res.status(201).json(await model.openCashSession(req.tenantId,req.user.id,Number(req.body.openingAmount)||0,req.body.notes||null))}catch(e){fail(res,"Error al abrir caja",e)}};
export const postCashMovement=async(req,res)=>{try{const amount=Number(req.body.amount);if(!["income","expense"].includes(req.body.kind)||!Number.isFinite(amount)||amount<=0||!req.body.concept?.trim())return res.status(400).json({message:"Tipo, valor y concepto son obligatorios"});res.status(201).json(await model.addCashMovement(req.tenantId,req.user.id,req.params.id,{kind:req.body.kind,amount,concept:req.body.concept.trim()}))}catch(e){fail(res,"Error al registrar movimiento",e)}};
export const postCashClose=async(req,res)=>{try{res.json(await model.closeCashSession(req.tenantId,req.params.id,req.user.id,Number(req.body.closingAmount)||0))}catch(e){fail(res,"Error al cerrar caja",e)}};
const reportRange=(period,dateValue)=>{const base=validDate(dateValue)?new Date(`${dateValue}T00:00:00-05:00`):new Date();const colombia=new Date(base.toLocaleString("en-US",{timeZone:"America/Bogota"}));let year=colombia.getFullYear(),month=colombia.getMonth(),day=colombia.getDate();if(period==="week"){const weekday=new Date(year,month,day).getDay()||7;day-=weekday-1}if(period==="month")day=1;const pad=value=>String(value).padStart(2,"0");const startDate=`${year}-${pad(month+1)}-${pad(day)}`;const start=new Date(`${startDate}T00:00:00-05:00`);const end=new Date(start);if(period==="month")end.setUTCMonth(end.getUTCMonth()+1);else end.setUTCDate(end.getUTCDate()+(period==="week"?7:1));return{from:start.toISOString(),to:end.toISOString(),period:period||"day",startDate}};
export const getReportSummary=async(req,res)=>{try{
  const period=["day","week","month"].includes(req.query.period)?req.query.period:"day";
  const range=reportRange(period,req.query.date);
  const [orders,movements,refunds,cashSessions]=await Promise.all([
    model.listOrdersInRange(req.tenantId,range.from,range.to),
    model.listCashMovementsInRange(req.tenantId,range.from,range.to),
    model.listRefundsInRange(req.tenantId,range.from,range.to),
    model.listCashSessionsInRange(req.tenantId,range.from,range.to)
  ]);
  const valid=orders.filter(order=>order.status==="paid");
  const sales=valid.reduce((sum,order)=>sum+Number(order.total),0);
  const refundTotal=refunds.reduce((sum,item)=>sum+Number(item.amount),0);
  const deliveryFees=valid.filter(order=>order.service_type==="delivery").reduce((sum,order)=>sum+Number(order.service_fee||0),0);
  const packagingFees=valid.filter(order=>order.service_type==="takeaway").reduce((sum,order)=>sum+Number(order.service_fee||0),0);
  const paymentTotals={cash:0,card:0,transfer:0};
  cashSessions.flatMap(session=>session.payments||[]).forEach(payment=>{paymentTotals[payment.method]=(paymentTotals[payment.method]||0)+Number(payment.amount)});
  const expenses=movements.filter(item=>item.kind==="expense");
  const incomes=movements.filter(item=>item.kind==="income");
  const expenseTotal=expenses.reduce((sum,item)=>sum+Number(item.amount),0);
  const incomeTotal=incomes.reduce((sum,item)=>sum+Number(item.amount),0);
  const openingBase=cashSessions.reduce((sum,item)=>sum+Number(item.opening_amount||0),0);
  const cashRefundTotal=refunds.filter(item=>item.method==="cash").reduce((sum,item)=>sum+Number(item.amount),0);
  const expectedCash=openingBase+paymentTotals.cash+incomeTotal-expenseTotal-cashRefundTotal;
  const expectedBalance=openingBase+Object.values(paymentTotals).reduce((sum,value)=>sum+value,0)+incomeTotal-expenseTotal-refundTotal;
  const cashSessionDetail=cashSessions.map(session=>{
    const sessionPayments={cash:0,card:0,transfer:0};
    (session.payments||[]).forEach(payment=>{sessionPayments[payment.method]=(sessionPayments[payment.method]||0)+Number(payment.amount)});
    const sessionIncomes=(session.cash_movements||[]).filter(item=>item.kind==="income").reduce((sum,item)=>sum+Number(item.amount),0);
    const sessionExpenses=(session.cash_movements||[]).filter(item=>item.kind==="expense").reduce((sum,item)=>sum+Number(item.amount),0);
    const sessionCashRefunds=(session.refunds||[]).filter(item=>item.method==="cash").reduce((sum,item)=>sum+Number(item.amount),0);
    const expected=Number(session.opening_amount||0)+sessionPayments.cash+sessionIncomes-sessionExpenses-sessionCashRefunds;
    const counted=session.closing_amount===null?null:Number(session.closing_amount);
    return{id:session.id,openedAt:session.opened_at,closedAt:session.closed_at,status:session.status,openingBase:Number(session.opening_amount||0),payments:sessionPayments,incomes:sessionIncomes,expenses:sessionExpenses,cashRefunds:sessionCashRefunds,expectedCash:expected,countedCash:counted,difference:counted===null?null:counted-expected};
  });
  const refundOrders=new Map();
  refunds.forEach(item=>{const key=item.order_id;if(!refundOrders.has(key))refundOrders.set(key,{id:key,number:item.orders?.order_number,date:item.created_at,reason:item.reason,total:0,refunds:[]});const entry=refundOrders.get(key);entry.total+=Number(item.amount);entry.refunds.push(item)});
  res.json({range,sales,refundTotal,foodSales:sales-deliveryFees-packagingFees,deliveryFees,packagingFees,paymentTotals,openingBase,incomeTotal,cashRefundTotal,expectedCash,expectedBalance,cashSessionDetail,expenseTotal,orders:valid.length,average:valid.length?sales/valid.length:0,salesDetail:valid.map(order=>({id:order.id,number:order.order_number,date:order.created_at,serviceType:order.service_type,reference:order.dining_tables?.name||order.customer_name||order.notes||"Pedido",foodSubtotal:Number(order.subtotal),serviceFee:Number(order.service_fee||0),total:Number(order.total),items:order.order_items,payments:order.payments||[]})),refundDetail:[...refundOrders.values()],expenseDetail:expenses.map(item=>({id:item.id,date:item.created_at,concept:item.concept,amount:Number(item.amount)}))});
}catch(e){fail(res,"Error al generar informe",e)}};
