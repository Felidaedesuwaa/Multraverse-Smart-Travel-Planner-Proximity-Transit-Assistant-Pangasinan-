import { itineraryPdfDocument } from './itineraryPdfDocument';

export function itineraryPdf(plan, areaName) {
  return new Blob([itineraryPdfDocument(plan, areaName)], { type: 'application/pdf' });
}

export function downloadItineraryPdf(plan, areaName) {
  const url = URL.createObjectURL(itineraryPdf(plan, areaName));
  const link = document.createElement('a');
  link.href = url; link.download = `${plan.request.areaId}-itinerary.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
