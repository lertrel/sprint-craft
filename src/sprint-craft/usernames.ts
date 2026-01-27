export function getAnonymousUserName(): string {
  return "User 1";
}

export function resolveUsername(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : getAnonymousUserName();
}

export function formatUsername(name: string): string {
  return `<${name}>`;
}
