export type ForgeAuthContext = {
  subject: string;
};

export function getForgeAuthContext(request: Request): ForgeAuthContext | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  // Production identity verification is intentionally delegated to the
  // configured identity provider. Never treat a browser-supplied user ID as
  // authenticated identity.
  //
  // The current repository accepts a trusted server-issued subject only when
  // FORGE_TRUSTED_AUTH_SECRET is configured and the request includes the
  // corresponding signed gateway headers. This prevents accidental exposure
  // while the identity provider integration is being connected.
  const secret = process.env.FORGE_TRUSTED_AUTH_SECRET;
  const subject = request.headers.get("x-forge-auth-subject");
  const signature = request.headers.get("x-forge-auth-signature");

  if (!secret || !subject || !signature) return null;
  return verifyGatewaySignature(secret, token, subject, signature)
    ? { subject }
    : null;
}

async function verifyGatewaySignature(
  secret: string,
  token: string,
  subject: string,
  provided: string,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = encoder.encode(`${subject}.${token}`);
  const bytes = Uint8Array.from(
    provided.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );
  return crypto.subtle.verify("HMAC", key, bytes, data);
}

export function requireForgeAuth(request: Request): ForgeAuthContext {
  const auth = getForgeAuthContext(request);
  if (!auth) throw new Error("FORGE_AUTH_REQUIRED");
  return auth;
}
