/**
 * Serialize a structured CV (JSON) into readable, stable, multi-line text so a
 * line-based diff viewer can render a GitHub-style side-by-side comparison.
 * Ordering is deterministic so unchanged lines align on both sides.
 */
export function cvToText(content: Record<string, unknown>): string {
  const lines: string[] = [];

  const walk = (prefix: string, value: unknown) => {
    if (value == null) return;
    if (typeof value === "string") {
      if (value.trim()) lines.push(prefix ? `${prefix}: ${value}` : value);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      lines.push(`${prefix}: ${String(value)}`);
    } else if (Array.isArray(value)) {
      value.forEach((item) => walk(prefix, item));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(prefix ? `${prefix}.${k}` : k, v);
      }
    }
  };

  for (const [section, value] of Object.entries(content)) {
    lines.push(`# ${section.toUpperCase()}`);
    walk("", value);
    lines.push("");
  }
  return lines.join("\n").trim();
}
