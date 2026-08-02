export type DatabaseConnection = {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  /** Prefer URL when present (Fly Managed/attached Postgres). */
  url?: string;
  ssl: boolean | { rejectUnauthorized: boolean };
};

/** Parse postgres:// / postgresql:// DATABASE_URL into connection fields. */
export function parseDatabaseUrl(url: string): DatabaseConnection {
  const parsed = new URL(url);
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!parsed.hostname || !name) {
    throw new Error("DATABASE_URL must include host and database name");
  }

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "5432", 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    name,
    url,
    // Fly / managed Postgres typically needs TLS.
    ssl: { rejectUnauthorized: false },
  };
}

export function resolveDatabaseConnection(): DatabaseConnection {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return parseDatabaseUrl(url);
  }

  const host = process.env.DB_HOST;
  const username = process.env.DB_USERNAME;
  const name = process.env.DB_NAME;
  if (!host || !username || !name) {
    throw new Error("Set DATABASE_URL or DB_HOST/DB_USERNAME/DB_NAME");
  }

  return {
    host,
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username,
    password: process.env.DB_PASSWORD ?? "",
    name,
    ssl: false,
  };
}
