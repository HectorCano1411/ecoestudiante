"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, callbackUrl: "/" });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center">
      <form onSubmit={doLogin} className="w-full max-w-sm p-6 space-y-4 rounded-2xl border">
        <h1 className="text-xl font-semibold">EcoEstudiante — Login</h1>
        <input
          className="w-full rounded-md border p-2 bg-black/20"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button disabled={loading} className="w-full rounded-md border p-2">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
