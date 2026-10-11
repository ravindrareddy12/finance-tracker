// Reads the (unverified) JWT payload on the client — only used to know when the
// token expires. The server remains the authority on whether a token is valid.

interface JwtPayload {
  sub?: string;
  username?: string;
  exp?: number; // seconds since epoch
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return decodeURIComponent(
    Array.from(atob(padded), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    return payload ? (JSON.parse(base64UrlDecode(payload)) as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** Milliseconds until expiry (negative when expired), or null when unknown. */
export function msUntilExpiry(token: string): number | null {
  const exp = decodeJwt(token)?.exp;
  return exp ? exp * 1000 - Date.now() : null;
}

// Treat tokens about to expire as already expired so requests don't race the deadline
const EXPIRY_SKEW_MS = 30_000;

export function isExpired(token: string): boolean {
  const ms = msUntilExpiry(token);
  return ms !== null && ms <= EXPIRY_SKEW_MS;
}
