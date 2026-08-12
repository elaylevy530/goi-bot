function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function env(name: string, fallback: string) {
  const value = (import.meta as ImportMeta & { env: Record<string, string | undefined> })
    .env[name];
  return trimSlash((value && String(value).trim()) || fallback);
}

/** Absolute URLs to sibling frontend apps (marketing split). */
export const externalApps = {
  landing: env("VITE_LANDING_URL", "http://localhost:5175"),
  partners: env("VITE_PARTNERS_URL", "http://localhost:5176"),
  hovalot: env("VITE_HOVALOT_URL", "http://localhost:5174"),
};
