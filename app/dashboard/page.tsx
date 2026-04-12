"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated } from "@/lib/api/auth";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticación
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Obtener usuario y redirigir según rol
    const user = getCurrentUser();

    if (user?.role === "ADMIN") {
      router.push("/admin");
    } else if (user?.role === "CLIENT") {
      router.push("/simulate/credit");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}
