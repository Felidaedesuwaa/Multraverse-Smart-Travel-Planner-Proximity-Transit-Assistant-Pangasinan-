import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export async function chooseProfilePhoto() {
  // Invoke directly from a press so browsers can open their file chooser.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], allowsMultipleSelection: false, allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return undefined;
  const asset = result.assets[0];
  if (asset.fileSize > 15 * 1024 * 1024) throw new Error("Please choose an image smaller than 15 MB.");
  if (!(asset.width > 0 && asset.height > 0)) throw new Error("This image could not be read. Try a JPEG or PNG photo.");

  const context = ImageManipulator.manipulate(asset.uri);
  let rendered;
  try {
    const side = Math.min(asset.width, asset.height);
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side });
    context.resize({ width: 512, height: 512 });
    rendered = await context.renderAsync();
    const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (!image.base64 || image.base64.length > Math.ceil(512 * 1024 / 3) * 4) throw new Error("This photo is too large. Please choose a smaller image.");
    return `data:image/jpeg;base64,${image.base64}`;
  } finally {
    rendered?.release();
    context.release();
  }
}
