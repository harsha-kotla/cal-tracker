const MAX_EDGE = 1280;

export async function compressPhoto(file: File) {
  if (file.size > 12_000_000) throw new Error("That photo is too large. Try another shot.");
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that photo.");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("Could not read that photo.");
    return blob;
  } catch (error) {
    if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") return file;
    if (error instanceof Error && error.message === "Could not read that photo.") throw error;
    throw new Error("Use the camera or a JPEG photo. This file type could not be read.");
  }
}
