import { File, Paths } from 'expo-file-system';
import { itineraryPdfDocument } from './itineraryPdfDocument';

export async function downloadItineraryPdf(plan, areaName) {
  // Load only on export so an older preview client can still open the planner.
  const Sharing = require('expo-sharing');
  if (!await Sharing.isAvailableAsync()) {
    throw new Error('PDF saving is unavailable on this device.');
  }
  const safeName = value => String(value || 'trip').replace(/[^a-zA-Z0-9_-]/g, '-');
  const file = new File(Paths.document, `${safeName(plan.request.areaId)}-${safeName(plan.id || plan.request.date)}-itinerary.pdf`);
  file.create({ overwrite: true });
  file.write(itineraryPdfDocument(plan, areaName));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Save your itinerary PDF',
  });
  return file.uri;
}
