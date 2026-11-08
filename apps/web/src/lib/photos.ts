import { apiBase } from "@/lib/api";
import type { PhotoCreated } from "@/generated/model";
import { ApiError } from "@/mutator";

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export async function photoForUpload(file: File): Promise<File> {
  if (file.size <= PHOTO_MAX_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    let quality = 0.92;
    let blob = await encodeJpeg(bitmap, width, height, quality);
    while (blob.size > PHOTO_MAX_BYTES && quality > 0.5) {
      quality = Math.round((quality - 0.1) * 10) / 10;
      blob = await encodeJpeg(bitmap, width, height, quality);
    }
    while (blob.size > PHOTO_MAX_BYTES && width > 1 && height > 1) {
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
      quality = 0.8;
      blob = await encodeJpeg(bitmap, width, height, quality);
      while (blob.size > PHOTO_MAX_BYTES && quality > 0.45) {
        quality = Math.round((quality - 0.1) * 10) / 10;
        blob = await encodeJpeg(bitmap, width, height, quality);
      }
    }
    if (blob.size > PHOTO_MAX_BYTES) throw new Error("Image is still over 5 MiB");
    return new File([blob], jpegName(file.name), { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export async function uploadPhotoFile(file: File): Promise<PhotoCreated> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${apiBase}/photos`, {
    method: "POST",
    body,
    credentials: "include",
  });
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const errors =
      data && typeof data === "object" && "errors" in data
        ? (data as { errors?: unknown }).errors
        : undefined;
    const message = Array.isArray(errors)
      ? errors.join("; ")
      : response.statusText || "Upload failed";
    throw new ApiError(response.status, message);
  }
  if (!data || typeof data !== "object" || !("id" in data)) {
    throw new ApiError(response.status, "Upload failed");
  }
  const id = (data as { id: unknown }).id;
  const url = (data as { url?: unknown }).url;
  if (typeof id !== "number") throw new ApiError(response.status, "Upload failed");
  return { id, url: typeof url === "string" ? url : `/photos/${id}` };
}

function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Canvas is unavailable"));
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode JPEG"));
      },
      "image/jpeg",
      quality
    );
  });
}

function jpegName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "") || "photo";
  return `${stem}.jpg`;
}
