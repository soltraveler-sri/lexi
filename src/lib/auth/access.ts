// Single-tenant guard. When LEXI_ALLOWED_EMAILS is set, only those addresses
// can use the app. When unset, all signed-in users are allowed (the BYOK fork
// default). The operator's hosted deployment sets this env var to its own
// email so the public Vercel URL stays effectively private.

function parseAllowedEmails(): Set<string> | null {
  const raw = process.env.LEXI_ALLOWED_EMAILS?.trim();

  if (!raw) {
    return null;
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowed = parseAllowedEmails();

  if (!allowed || allowed.size === 0) {
    return true;
  }

  if (!email) {
    return false;
  }

  return allowed.has(email.trim().toLowerCase());
}

export function isAccessRestricted(): boolean {
  const allowed = parseAllowedEmails();
  return allowed !== null && allowed.size > 0;
}
