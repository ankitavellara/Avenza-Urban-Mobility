"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Navigation } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not sign in.");
      const requested = searchParams.get("next") || "/dashboard";
      router.replace(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold text-[#344054]">Email
        <input name="email" type="email" autoComplete="email" required maxLength={150} className={inputClass} />
      </label>
      <label className="block text-sm font-semibold text-[#344054]">Password
        <input name="password" type="password" autoComplete="current-password" required maxLength={200} className={inputClass} />
      </label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-[#172033] px-5 py-3.5 font-bold text-white hover:bg-[#293951] disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[#64748B]">New to Avenza? <Link href="/register" className="font-semibold text-[#5079B4] hover:underline">Create an account</Link></p>
    </form>
  );
}

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4 py-12">
    <section className="w-full max-w-md rounded-3xl border border-[#E1E7F0] bg-white p-7 shadow-sm sm:p-9">
      <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-[#172033]"><Navigation size={20} className="text-[#668EC6]" /> avenza.</Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-[#172033]">Welcome back</h1>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">Sign in to explore Avenza’s mobility dashboard.</p>
      <Suspense fallback={<p className="mt-7 text-sm text-[#64748B]">Loading sign-in…</p>}><LoginForm /></Suspense>
    </section>
  </main>;
}

const inputClass = "mt-2 block w-full rounded-xl border border-[#DCE3ED] px-3.5 py-3 text-sm outline-none focus:border-[#83ACE5] focus:ring-2 focus:ring-[#A5C5F0]/40";
