"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated } from "@/lib/api/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const user = getCurrentUser();

    if (user?.role === "ADMIN") {
      router.push("/admin/investments");
      return;
    }

    router.push("/simulate/credit");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-white/3 px-6 py-4 text-slate-300 shadow-lg backdrop-blur-lg">Redirigiendo al módulo correspondiente...</div>
    </div>
  );
}
