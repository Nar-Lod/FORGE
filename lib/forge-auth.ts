import { auth } from "@clerk/nextjs/server";

export type ForgeAuthContext = { subject: string };

export async function getForgeAuthContext(): Promise<ForgeAuthContext | null> {
  const session = await auth();
  return session.userId ? { subject: session.userId } : null;
}

export async function requireForgeAuth(): Promise<ForgeAuthContext> {
  const value = await getForgeAuthContext();
  if (!value) throw new Error("FORGE_AUTH_REQUIRED");
  return value;
}
