// shared password rules for settings forms
export const MIN_PASSWORD = 8;

// count real characters, emoji = 1
export function passwordCharacterLength(value: string): number {
  return Array.from(value).length;
}

// bcrypt read max 72 bytes, so cut there
export function limitPasswordBytes(value: string): string {
  let limited = "";
  for (const character of value) {
    const next = limited + character;
    if (new TextEncoder().encode(next).length > 72) break;
    limited = next;
  }
  return limited;
}
