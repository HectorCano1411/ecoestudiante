import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import type { Session } from "next-auth";

export async function requireSession() {
  const session = await getServerSession(authOptions as any) as Session | null;
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
  return session;
}
