
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172033] lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-[#E1E7F0] bg-white px-4 sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#58677D]">
              Avenza workspace
            </p>
            <h1 className="text-base font-bold tracking-tight sm:text-xl">
              Urban mobility dashboard
            </h1>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-[#E1E7F0] px-3 py-2 text-sm font-semibold hover:bg-[#F5F7FB]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A5C5F0] text-[#172033]">
              G
            </span>
            <span className="hidden sm:inline">Guest preview</span>
            <ChevronDown size={15} className="hidden sm:block" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
