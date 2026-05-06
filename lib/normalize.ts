export function normalizeQuery(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[.,，。·•\-_/\\]/g, "");
}
