"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountControls({ name, role }: { name: string; role: "USER" | "ADMIN" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return <div className="flex items-center gap-3">
    <div className="hidden text-right sm:block">
      <p className="text-sm font-semibold text-[#172033]">{name}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-[#668EC6]">{role}</p>
    </div>
    <button onClick={signOut} disabled={pending} className="rounded-xl border border-[#E1E7F0] px-3 py-2 text-sm font-semibold text-[#526178] hover:bg-[#F5F7FB] disabled:opacity-60">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  </div>;
}
