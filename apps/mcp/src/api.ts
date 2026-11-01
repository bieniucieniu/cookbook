import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultApiUrl = "http://127.0.0.1:8080";
const envKeys = ["COOKBOOK_API_URL", "AGENT_TOKEN"] as const;

let envLoaded = false;

function unset(name: string): boolean {
  const value = process.env[name];
  return value === undefined || value.trim() === "" || value.includes("${env:");
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function fillFromFile(path: string): void {
  if (!existsSync(path)) return;
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const body = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!envKeys.includes(key as (typeof envKeys)[number]) || !unset(key)) continue;
    const value = unquote(body.slice(eq + 1).trim());
    if (value) process.env[key] = value;
  }
}

function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, "../../../.env"), resolve(process.cwd(), ".env")];
  for (const path of candidates) fillFromFile(path);
}

function apiBase(): string {
  loadEnv();
  const configured = process.env.COOKBOOK_API_URL?.trim();
  const base = configured && !configured.includes("${env:") ? configured : defaultApiUrl;
  return base.replace(/\/+$/, "");
}

function agentToken(): string {
  loadEnv();
  const token = process.env.AGENT_TOKEN?.trim();
  if (!token || token.includes("${env:")) {
    throw new Error("AGENT_TOKEN is not set");
  }
  return token;
}

function scrub(text: string, token: string): string {
  return text.split(token).join("[redacted]");
}

export async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  const token = agentToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${scrub(text, token)}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
