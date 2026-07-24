const safe = (value) => value ?? "";
const profileRows = (profile) => [
  ["Razón social", safe(profile?.tenant?.legal_name)],
  ["Nombre comercial", safe(profile?.restaurant?.name)],
  ["Tipo de documento", safe(profile?.tenant?.document_type)],
  ["Número de documento", safe(profile?.tenant?.document_number)],
  ["Dígito de verificación", safe(profile?.tenant?.verification_digit)],
  ["Sede", safe(profile?.branch?.name)],
  ["Dirección", safe(profile?.branch?.address)],
  ["Ciudad", safe(profile?.branch?.city)],
  ["Teléfono", safe(profile?.tenant?.phone)],
  ["Correo", safe(profile?.tenant?.billing_email)],
];
const periodLabel = { day: "Día", week: "Semana", month: "Mes" };
const serviceLabel = { table: "Mesa", takeaway: "Para llevar", delivery: "Domicilio" };
const formatDate = (value) => value ? new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "";
const downloadBlob = (blob, filename) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };

const styleSheet = (sheet, title, profile, period, date) => {
  sheet.mergeCells("A1:F1"); const titleCell = sheet.getCell("A1"); titleCell.value = title; titleCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } }; titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F32" } }; titleCell.alignment = { vertical: "middle" }; sheet.getRow(1).height = 30;
  profileRows(profile).forEach(([label, value], index) => { const row = index + 3; sheet.getCell(row, 1).value = label; sheet.getCell(row, 1).font = { bold: true, color: { argb: "FF465A51" } }; sheet.mergeCells(row, 2, row, 3); sheet.getCell(row, 2).value = value; });
  sheet.getCell("E3").value = "Periodo"; sheet.getCell("E3").font = { bold: true }; sheet.getCell("F3").value = periodLabel[period] || period;
  sheet.getCell("E4").value = "Fecha de referencia"; sheet.getCell("E4").font = { bold: true }; sheet.getCell("F4").value = date;
  sheet.getColumn(1).width = 23; sheet.getColumn(2).width = 24; sheet.getColumn(3).width = 20; sheet.getColumn(4).width = 20; sheet.getColumn(5).width = 23; sheet.getColumn(6).width = 24;
};
const addTable = (sheet, startRow, headers, rows, currencyColumns = []) => {
  const headerRow = sheet.getRow(startRow); headers.forEach((header, index) => { const cell = headerRow.getCell(index + 1); cell.value = header; cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E6654" } }; cell.alignment = { vertical: "middle" }; }); headerRow.height = 22;
  rows.forEach((values, rowIndex) => { const row = sheet.getRow(startRow + 1 + rowIndex); values.forEach((value, columnIndex) => { const cell = row.getCell(columnIndex + 1); cell.value = value; if (currencyColumns.includes(columnIndex)) cell.numFmt = '"$"#,##0.00'; }); if (rowIndex % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F2" } }; });
  sheet.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow + rows.length, column: headers.length } };
};

export async function downloadReportExcel({ data, profile, period, date }) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Obsidian Mesa"; workbook.created = new Date();
  const summary = workbook.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 14 }] }); styleSheet(summary, "Informe del restaurante", profile, period, date);
  addTable(summary, 14, ["Concepto", "Valor"], [["Ventas pagadas", Number(data.sales || 0)], ["Devoluciones", Number(data.refundTotal || 0)], ["Salidas", Number(data.expenseTotal || 0)], ["Efectivo", Number(data.paymentTotals?.cash || 0)], ["Tarjeta", Number(data.paymentTotals?.card || 0)], ["Transferencia", Number(data.paymentTotals?.transfer || 0)], ["Domicilios", Number(data.deliveryFees || 0)], ["Empaques", Number(data.packagingFees || 0)]], [1]);
  const sales = workbook.addWorksheet("Ventas", { views: [{ state: "frozen", ySplit: 14 }] }); styleSheet(sales, "Detalle de ventas", profile, period, date); addTable(sales, 14, ["Pedido", "Fecha", "Servicio", "Referencia", "Alimentos", "Cargo adicional", "Total"], (data.salesDetail || []).map((item) => [`#${item.number}`, formatDate(item.date), serviceLabel[item.serviceType] || item.serviceType, item.reference, Number(item.foodSubtotal), Number(item.serviceFee), Number(item.total)]), [4, 5, 6]);
  const refunds = workbook.addWorksheet("Devoluciones", { views: [{ state: "frozen", ySplit: 14 }] }); styleSheet(refunds, "Detalle de devoluciones", profile, period, date); addTable(refunds, 14, ["Pedido", "Fecha", "Motivo", "Valor"], (data.refundDetail || []).map((item) => [`#${item.number}`, formatDate(item.date), item.reason, Number(item.total)]), [3]);
  const expenses = workbook.addWorksheet("Salidas", { views: [{ state: "frozen", ySplit: 14 }] }); styleSheet(expenses, "Detalle de salidas", profile, period, date); addTable(expenses, 14, ["Fecha", "Concepto", "Valor"], (data.expenseDetail || []).map((item) => [formatDate(item.date), item.concept, Number(item.amount)]), [2]);
  [summary, sales, refunds, expenses].forEach((sheet) => { sheet.eachRow((row) => { row.alignment = { vertical: "middle", wrapText: true }; }); sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .25, right: .25, top: .4, bottom: .4, header: .2, footer: .2 } }; });
  const buffer = await workbook.xlsx.writeBuffer(); downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `informe-${period}-${date}.xlsx`);
}

export async function downloadReportPdf({ data, profile, period, date }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const drawHeader = () => { doc.setFillColor(23, 63, 50); doc.rect(0, 0, 297, 22, "F"); doc.setTextColor(255); doc.setFontSize(17); doc.setFont("helvetica", "bold"); doc.text("Informe del restaurante", 12, 14); doc.setTextColor(35); doc.setFontSize(8); doc.setFont("helvetica", "normal"); const rows = profileRows(profile); rows.forEach(([label, value], index) => { const column = index < 5 ? 12 : 104; const row = index % 5; doc.setFont("helvetica", "bold"); doc.text(`${label}:`, column, 30 + row * 5); doc.setFont("helvetica", "normal"); doc.text(String(value), column + 31, 30 + row * 5, { maxWidth: 58 }); }); doc.setFont("helvetica", "bold"); doc.text("Periodo:", 205, 30); doc.setFont("helvetica", "normal"); doc.text(periodLabel[period] || period, 224, 30); doc.setFont("helvetica", "bold"); doc.text("Fecha:", 205, 35); doc.setFont("helvetica", "normal"); doc.text(date, 224, 35); };
  drawHeader();
  autoTable(doc, { startY: 58, head: [["Ventas", "Devoluciones", "Salidas", "Efectivo", "Tarjeta", "Transferencia"]], body: [[Number(data.sales || 0), Number(data.refundTotal || 0), Number(data.expenseTotal || 0), Number(data.paymentTotals?.cash || 0), Number(data.paymentTotals?.card || 0), Number(data.paymentTotals?.transfer || 0)].map((value) => `$${value.toLocaleString("es-CO")}`)], theme: "grid", headStyles: { fillColor: [46, 102, 84] }, styles: { fontSize: 8 } });
  let startY = doc.lastAutoTable.finalY + 8;
  autoTable(doc, { startY, head: [["Pedido", "Fecha", "Servicio", "Referencia", "Alimentos", "Cargo", "Total"]], body: (data.salesDetail || []).map((item) => [`#${item.number}`, formatDate(item.date), serviceLabel[item.serviceType] || item.serviceType, item.reference, `$${Number(item.foodSubtotal).toLocaleString("es-CO")}`, `$${Number(item.serviceFee).toLocaleString("es-CO")}`, `$${Number(item.total).toLocaleString("es-CO")}`]), theme: "striped", headStyles: { fillColor: [23, 63, 50] }, styles: { fontSize: 7 }, didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) drawHeader(); } });
  startY = doc.lastAutoTable.finalY + 8;
  if (startY > 165) { doc.addPage(); drawHeader(); startY = 58; }
  autoTable(doc, { startY, head: [["Devoluciones", "Fecha", "Motivo", "Valor"]], body: (data.refundDetail || []).map((item) => [`#${item.number}`, formatDate(item.date), item.reason, `$${Number(item.total).toLocaleString("es-CO")}`]), theme: "grid", headStyles: { fillColor: [154, 92, 38] }, styles: { fontSize: 7 } });
  startY = doc.lastAutoTable.finalY + 8;
  if (startY > 165) { doc.addPage(); drawHeader(); startY = 58; }
  autoTable(doc, { startY, head: [["Salidas", "Fecha", "Concepto", "Valor"]], body: (data.expenseDetail || []).map((item) => ["Salida", formatDate(item.date), item.concept, `$${Number(item.amount).toLocaleString("es-CO")}`]), theme: "grid", headStyles: { fillColor: [130, 55, 55] }, styles: { fontSize: 7 } });
  const pages = doc.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setFontSize(7); doc.setTextColor(100); doc.text(`Página ${page} de ${pages}`, 285, 202, { align: "right" }); }
  doc.save(`informe-${period}-${date}.pdf`);
}

export async function downloadInventoryExcel({rows,profile,date}){
  const{default:ExcelJS}=await import("exceljs");const workbook=new ExcelJS.Workbook();workbook.creator="Obsidian Gastro";const sheet=workbook.addWorksheet("Inventario",{views:[{state:"frozen",ySplit:14}]});styleSheet(sheet,"Inventario del día",profile,"Día",date);
  addTable(sheet,14,["Producto","Categoría","Existencia inicial","Disponible","Estado"],rows.map(row=>[row.name,row.category,row.initialLabel,row.remainingLabel,row.statusLabel]));
  sheet.getColumn(1).width=30;sheet.getColumn(2).width=24;sheet.getColumn(3).width=20;sheet.getColumn(4).width=20;sheet.getColumn(5).width=18;sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};
  const buffer=await workbook.xlsx.writeBuffer();downloadBlob(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`inventario-${date}.xlsx`);
}

export async function downloadInventoryPdf({rows,profile,date}){
  const[{jsPDF},{autoTable}]=await Promise.all([import("jspdf"),import("jspdf-autotable")]);const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  doc.setFillColor(23,63,50);doc.rect(0,0,297,22,"F");doc.setTextColor(255);doc.setFontSize(17);doc.setFont("helvetica","bold");doc.text("Inventario del día",12,14);doc.setTextColor(35);doc.setFontSize(8);
  profileRows(profile).slice(0,10).forEach(([label,value],index)=>{const column=index<5?12:104,row=index%5;doc.setFont("helvetica","bold");doc.text(`${label}:`,column,30+row*5);doc.setFont("helvetica","normal");doc.text(String(value),column+31,30+row*5,{maxWidth:58})});doc.setFont("helvetica","bold");doc.text("Fecha:",205,30);doc.setFont("helvetica","normal");doc.text(date,224,30);
  autoTable(doc,{startY:58,head:[["Producto","Categoría","Existencia inicial","Disponible","Estado"]],body:rows.map(row=>[row.name,row.category,row.initialLabel,row.remainingLabel,row.statusLabel]),theme:"striped",headStyles:{fillColor:[46,102,84]},styles:{fontSize:8}});
  doc.save(`inventario-${date}.pdf`);
}
