/**
 * Thin Nest files/storage API helpers for browser/client code.
 */

import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

export type NestFileUploadResult = {
  bucket: string;
  path: string;
  url: string;
  contentType: string;
  size: number;
};

export type NestSignedUrlResult = {
  url: string;
};

function token() {
  return getNestAccessToken();
}

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  return (fromEnv ?? "").replace(/\/$/, "");
}

/** Turn Nest relative file URL into a fetchable absolute URL (same-origin when proxied). */
export function resolveNestFileUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith("http")) return relativeOrAbsolute;
  const base = apiBaseUrl();
  return `${base}${relativeOrAbsolute.startsWith("/") ? relativeOrAbsolute : `/${relativeOrAbsolute}`}`;
}

export function nestSignedFileUrl(
  bucket: string,
  path: string,
  expiresIn?: string | number,
) {
  return apiFetch<NestSignedUrlResult>(`/api/files/${encodeURIComponent(bucket)}/signed-url`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify({ path, expiresIn }),
  });
}

export async function nestSignedFileUrlResolved(
  bucket: string,
  path: string,
  expiresIn?: string | number,
) {
  const { url } = await nestSignedFileUrl(bucket, path, expiresIn);
  return resolveNestFileUrl(url);
}

export function nestUploadFile(bucket: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<NestFileUploadResult>(`/api/files/${encodeURIComponent(bucket)}`, {
    method: "POST",
    accessToken: token(),
    body: form,
  });
}

export function nestDeleteFile(bucket: string, path: string) {
  return apiFetch<{ ok: true }>(`/api/files/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    accessToken: token(),
    body: JSON.stringify({ path }),
  });
}
