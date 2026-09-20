export function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinList(value?: string[]): string {
  return (value ?? []).join(', ');
}
