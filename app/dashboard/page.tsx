"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated } from "@/lib/api/auth";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const user = getCurrentUser();

    if (user?.role === "ADMIN") {
      router.push("/admin/investments");
    } else if (user?.role === "CLIENT") {
      router.push("/simulate/credit");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-white/3 px-6 py-5 text-center shadow-lg backdrop-blur-lg">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
        <p className="text-sm text-slate-300">Redirigiendo...</p>
      </div>
    </div>
  );
}
