import { z } from "zod";

export const paymentImageUploadSchema = z.object({
  type: z.enum(["image/png", "image/jpeg", "image/webp"], {
    errorMap: () => ({ message: "Usa una imagen JPG, PNG o WebP." }),
  }),
  size: z
    .number()
    .positive()
    .max(5 * 1024 * 1024, "La imagen debe pesar como máximo 5 MB."),
});

export async function prepareQrImage(file: File): Promise<string> {
  const parsed = paymentImageUploadSchema.safeParse({ type: file.type, size: file.size });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Imagen inválida.");
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  // Preserve exact QR pixels: no cropping, resizing or lossy recompression.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la imagen."));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}
