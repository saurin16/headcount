"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Ping = { ok: boolean; entity?: string; ms?: number };

export default function Home() {
  const [ping, setPing] = useState<Ping | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/qloo/ping`)
      .then((r) => r.json())
      .then(setPing)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold tracking-tight">Headcount</h1>
      <p className="text-lg text-neutral-600">
        Know who&apos;ll show up before you sign the offer.
      </p>
      <div className="rounded-lg border p-4 font-mono text-sm">
        {error && <span className="text-red-600">API unreachable: {error}</span>}
        {!error && !ping && <span>Checking API…</span>}
        {ping && (
          <span>
            API ✓ · Qloo ✓ resolved &quot;{ping.entity}&quot; in {ping.ms} ms
          </span>
        )}
      </div>
    </main>
  );
}
