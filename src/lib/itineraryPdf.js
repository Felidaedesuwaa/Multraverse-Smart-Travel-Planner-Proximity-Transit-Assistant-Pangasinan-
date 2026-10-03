// Small, dependency-free PDF writer. All text is escaped before entering PDF syntax.
const clean = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/₱/g, 'PHP ').replace(/[–—·×]/g, '-').replace(/[^\x20-\x7e]/g, ' ');
const escape = value => clean(value).replace(/([\\()])/g, '\\$1');
const amount = value => `PHP ${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const range = (min, max) => min === max ? amount(min) : `${amount(min)} - ${amount(max)}`;

export function itineraryPdf(plan, areaName) {
  const r = plan.request, c = plan.costEstimate;
  const pages = [];
  let commands, y;
  const page = () => {
    commands = ['0.07 0.23 0.37 rg 0 770 595 72 re f', 'BT /F2 20 Tf 1 1 1 rg 42 802 Td (MULTRAVERSE | TRAVEL PLAN) Tj ET'];
    pages.push(commands); y = 742;
  };
  page();
  const line = (text, size = 11, bold = false) => {
    if (y < 60) page();
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 0.09 0.2 0.29 rg 42 ${y} Td (${escape(text)}) Tj ET`);
    y -= size + 8;
  };
  const paragraph = text => {
    const words = clean(text).split(/\s+/); let row = '';
    for (const word of words) { if ((row + word).length > 83) { line(row); row = ''; } row += `${word} `; }
    if (row) line(row);
  };
  line(areaName || r.areaId, 22, true);
  paragraph(`${r.date} | ${r.days} days | ${r.travelers} travelers | ${r.transportModes.join(' / ')}`);
  paragraph([...r.tripTypes, ...r.activities].join(' / '));
  line('COST BREAKDOWN', 14, true);
  line(`Trip budget: ${amount(r.budget)}`);
  line(`Meals: ${amount(c?.meals ?? plan.mealAllocation)}`);
  line(`Transport: ${c?.transport.some(t => t.total != null) ? amount(c.transportTotal) : 'Not priced'}`);
  line(`Hotel: ${c?.lodging ? range(c.lodging.min, c.lodging.max) : r.days === 1 ? 'No overnight stay' : 'Not priced'}`);
  if (c?.lodging) line(`${c.lodging.nights} nights x ${c.lodging.rooms} rooms; same reference rates as Step 2`);
  line(`Emergency reserve: ${amount(c?.emergency ?? 0)} (10% of trip budget)`);
  line(`Listed entry fees: ${amount(c?.entryFees ?? 0)}; unpriced visits and extras to confirm`);
  if (c) {
    line(`Planned total: ${range(c.min, c.max)}`, 12, true);
    line(`Per person: ${range(c.perPersonMin, c.perPersonMax)}`);
    line(`Remaining budget: ${range(c.remainingMin, c.remainingMax)}`);
  }
  if (plan.foodOptions?.length) {
    line(`ALL LOCAL FOODS TO TRY (${plan.foodOptions.length})`, 14, true);
    paragraph(`Choose tastings within your ${amount(r.mealBudget)} per person daily meal allowance. This is a suggestion list, not a charge for buying every food.`);
    for (const food of plan.foodOptions) {
      paragraph(food.name);
      paragraph(food.description);
      if (food.where) paragraph(`Where: ${food.where}`);
      paragraph(food.listedAveragePrice == null ? 'Menu price to confirm' : `Listed average: ${amount(food.listedAveragePrice)}; confirm portions and price`);
      paragraph(`Source: ${food.source}`);
      y -= 8;
    }
  }
  for (let day = 1; day <= r.days; day++) {
    if (y < 140) page();
    y -= 12; line(`DAY ${day}`, 16, true);
    for (const stop of plan.stops.filter(s => s.day === day)) {
      if (y < 110) page();
      paragraph(`${stop.time} | ${stop.tag}`);
      line(stop.title, 12, true);
      paragraph(stop.subtitle); y -= 8;
    }
  }
  line('PLAN NOTES', 14, true);
  plan.warnings.forEach(paragraph);
  const objects = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const kids = [];
  pages.forEach((content, i) => {
    content.push(`BT /F1 9 Tf 0.4 0.45 0.5 rg 42 30 Td (Multraverse - Share your adventure | Page ${i + 1} of ${pages.length}) Tj ET`);
    const stream = content.join('\n'); const id = objects.length + 1; kids.push(`${id} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadItineraryPdf(plan, areaName) {
  const url = URL.createObjectURL(itineraryPdf(plan, areaName));
  const link = document.createElement('a');
  link.href = url; link.download = `${plan.request.areaId}-itinerary.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
