/**
 * Gracefully formats any PostgreSQL enum string for UI display.
 * Handles snake_case, PascalCase, and Title Case strings cleanly.
 */
export function formatEnumLabel(enumValue: string): string {
  if (!enumValue) return '';
  return enumValue
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
