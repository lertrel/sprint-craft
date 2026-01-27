const MAX_USERNAME_LENGTH = 10;

export function getAnonymousUserName(): string {
  return "User 1";
}

export function resolveUsername(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  const resolved = trimmed.length > 0 ? trimmed : getAnonymousUserName();
  return resolved.slice(0, MAX_USERNAME_LENGTH);
}

export function formatUsername(name: string): string {
  return `<${name}>`;
}
