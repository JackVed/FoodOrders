export const TABLESIDE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4174";

export function appUrl(path: string) {
  return new URL(path, TABLESIDE_BASE_URL).toString();
}