import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_PHOTO_LENGTH = 250000;

// Keep each photo inside the API's data-URL limit, including detailed phone photos.
export async function preparePlacePhoto(asset) {
  if (!(asset.width > 0 && asset.height > 0)) throw new Error('This photo could not be read. Try a JPEG or PNG image.');
  for (const [maxSide, compress] of [[1200, 0.75], [900, 0.6], [640, 0.5], [480, 0.4]]) {
    const context = ImageManipulator.manipulate(asset.uri);
    let rendered;
    try {
      const ratio = Math.min(1, maxSide / Math.max(asset.width, asset.height));
      context.resize({ width: Math.max(1, Math.round(asset.width * ratio)), height: Math.max(1, Math.round(asset.height * ratio)) });
      rendered = await context.renderAsync();
      const image = await rendered.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
      const uri = `data:image/jpeg;base64,${image.base64}`;
      if (image.base64 && uri.length <= MAX_PHOTO_LENGTH) return uri;
    } finally { rendered?.release(); context.release(); }
  }
  throw new Error('This photo is too large to save. Please choose a smaller image.');
}
