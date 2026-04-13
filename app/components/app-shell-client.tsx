"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentUser, isAuthenticated, logout, type User } from "@/lib/api/auth";

type AppShellClientProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  roles?: Array<User["role"]>;
  icon: string;
  description: string;
  group: "general" | "admin";
};

const navItems: NavItem[] = [
  {
    label: "Simulador Crédito",
    href: "/simulate/credit",
    roles: ["ADMIN", "CLIENT"],
    icon: "💳",
    description: "Métodos Francés y Alemán",
    group: "general",
  },
  {
    label: "Simulador Inversión",
    href: "/simulate/investment",
    roles: ["ADMIN", "CLIENT"],
    icon: "📈",
    description: "Rendimiento y proyección",
    group: "general",
  },
  {
    label: "Institución",
    href: "/admin?section=institution",
    roles: ["ADMIN"],
    icon: "🏢",
    description: "Nombre, RUC y logo",
    group: "admin",
  },
  {
    label: "Tipos de Crédito",
    href: "/admin?section=creditTypes",
    roles: ["ADMIN"],
    icon: "🧾",
    description: "Montos, tasas y sistemas",
    group: "admin",
  },
  {
    label: "Cargos Indirectos",
    href: "/admin?section=charges",
    roles: ["ADMIN"],
    icon: "💰",
    description: "Cobros por tipo de crédito",
    group: "admin",
  },
  {
    label: "Admin Inversiones",
    href: "/admin/investments",
    roles: ["ADMIN"],
    icon: "⚙️",
    description: "Configurar productos",
    group: "admin",
  },
];

function getAdminSectionTitle(section: string | null) {
  if (section === "creditTypes") return "Tipos de Crédito";
  if (section === "charges") return "Cargos Indirectos";
  return "Institución";
}

function getAdminSectionDescription(section: string | null) {
  if (section === "creditTypes") return "Montos, tasas y sistemas";
  if (section === "charges") return "Cobros y reglas por producto";
  return "Nombre, RUC y logo institucional";
}

export default function AppShellClient({ children }: AppShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isLoginPage = pathname === "/login";
  const adminSection = searchParams.get("section");

  useEffect(() => {
    if (isLoginPage) return;

    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser) {
      logout();
      router.replace("/login");
      return;
    }

    if (pathname.startsWith("/admin") && currentUser.role !== "ADMIN") {
      router.replace("/simulate/credit");
      return;
    }

    setUser(currentUser);
  }, [isLoginPage, pathname, router]);

  const visibleNavItems = useMemo(() => {
    if (!user) return [];

    return navItems.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.includes(user.role);
    });
  }, [user]);

  const generalItems = visibleNavItems.filter((item) => item.group === "general");
  const adminItems = visibleNavItems.filter((item) => item.group === "admin");

  const currentPageTitle = useMemo(() => {
    if (pathname === "/admin") {
      return getAdminSectionTitle(adminSection);
    }

    if (pathname === "/admin/investments") {
      return "Admin Inversiones";
    }

    if (pathname === "/simulate/credit") {
      return "Simulador Crédito";
    }

    if (pathname === "/simulate/investment") {
      return "Simulador Inversión";
    }

    return "SISCONTA";
  }, [pathname, adminSection]);

  const currentPageDescription = useMemo(() => {
    if (pathname === "/admin") {
      return getAdminSectionDescription(adminSection);
    }

    if (pathname === "/admin/investments") {
      return "Configurar productos de inversión";
    }

    if (pathname === "/simulate/credit") {
      return "Métodos Francés y Alemán";
    }

    if (pathname === "/simulate/investment") {
      return "Rendimiento y proyección";
    }

    return "Sistema financiero";
  }, [pathname, adminSection]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function isItemActive(item: NavItem) {
    if (item.href.startsWith("/admin?section=")) {
      const itemSection = item.href.split("section=")[1];
      return pathname === "/admin" && adminSection === itemSection;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
        <div className="rounded-2xl border border-white/10 bg-white/4 px-6 py-4 text-slate-300 shadow-xl backdrop-blur-xl">Cargando interfaz...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {sidebarOpen ? <button type="button" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden" /> : null}

      <aside className={`fixed inset-y-0 left-0 z-50 w-80 transform border-r border-white/10 bg-slate-950/85 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-400">SISCONTA</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Panel Financiero</h1>
                <p className="mt-2 text-sm text-slate-400">Créditos, inversiones y configuración</p>
              </div>

              <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/10 lg:hidden">
                ✕
              </button>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/7 to-white/2 p-4 shadow-lg shadow-black/20">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sesión activa</p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-500/20">{(user?.email?.[0] ?? "U").toUpperCase()}</div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.email ?? "Usuario"}</p>
                  <p className="mt-1 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{user?.role ?? "ROLE"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="mb-3 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Simuladores</p>
            </div>

            <nav className="space-y-2">
              {generalItems.map((item) => {
                const active = isItemActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group block rounded-2xl border px-4 py-3 transition-all ${active ? "border-indigo-400/30 bg-linear-to-r from-indigo-500/20 to-violet-500/10 shadow-lg shadow-indigo-500/10" : "border-transparent bg-white/2 hover:border-white/10 hover:bg-white/5"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${active ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-300 group-hover:bg-white/10"}`}>{item.icon}</div>

                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${active ? "text-white" : "text-slate-200"}`}>{item.label}</p>
                        <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {adminItems.length > 0 ? (
              <>
                <div className="mb-3 mt-8 px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Administración</p>
                </div>

                <nav className="space-y-2">
                  {adminItems.map((item) => {
                    const active = isItemActive(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group block rounded-2xl border px-4 py-3 transition-all ${active ? "border-blue-400/30 bg-linear-to-r from-blue-500/20 to-indigo-500/10 shadow-lg shadow-blue-500/10" : "border-transparent bg-white/2 hover:border-white/10 hover:bg-white/5"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${active ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-slate-300 group-hover:bg-white/10"}`}>{item.icon}</div>

                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${active ? "text-white" : "text-slate-200"}`}>{item.label}</p>
                            <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-5 py-5">
            <button type="button" onClick={handleLogout} className="w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/55 backdrop-blur-2xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 shadow-sm transition hover:bg-white/10 lg:hidden">
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Módulo actual</p>
                <h2 className="truncate text-xl font-bold text-white">{currentPageTitle}</h2>
                <p className="truncate text-sm text-slate-400">{currentPageDescription}</p>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user?.email ?? "Usuario"}</p>
                <p className="text-xs text-slate-400">{user?.role ?? ""}</p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">{(user?.email?.[0] ?? "U").toUpperCase()}</div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
