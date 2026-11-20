import { z } from "zod";

const uploadSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Usa fotografías JPG, PNG o WebP." }),
  }),
  size: z.number().max(5 * 1024 * 1024, "Cada fotografía debe pesar menos de 5 MB."),
});

export async function preparePhoto(file: File): Promise<string> {
  const validation = uploadSchema.safeParse({ type: file.type, size: file.size });
  if (!validation.success)
    throw new Error(validation.error.issues[0]?.message ?? "Fotografía no válida.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la fotografía.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.8);
  } finally {
    bitmap.close();
  }
}
