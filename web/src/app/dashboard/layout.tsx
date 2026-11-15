
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import AccountControls from "@/components/layout/account-controls";
import { getAuthenticatedUser } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardLoading />}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=%2Fdashboard");

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

          <AccountControls name={user.name} role={user.role} />
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] text-sm font-medium text-[#64748B]">Checking your Avenza session…</div>;
}
