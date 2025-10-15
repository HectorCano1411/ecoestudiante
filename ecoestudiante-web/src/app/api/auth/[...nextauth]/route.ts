// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    Credentials({
      name: "DevCredentials",
      credentials: {
        email: { label: "Email", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        return {
          id: crypto.randomUUID(),
          email: credentials.email,
          name: "Eco User",
        };
      },
    }),
  ],

  // Estrategia de sesión en v5 como string literal
  session: { strategy: "jwt" },

  // Página de login propia
  pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
