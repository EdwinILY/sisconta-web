"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  isAuthenticated,
  logout,
  type User,
} from "@/lib/api/auth";

type AppShellClientProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  roles?: Array<User["role"]>;
  icon: string;
  description: string;
};

const navItems: NavItem[] = [
  {
    label: "Simulador Crédito",
    href: "/simulate/credit",
    roles: ["ADMIN", "CLIENT"],
    icon: "💳",
    description: "Métodos Francés y Alemán",
  },
  {
    label: "Simulador Inversión",
    href: "/simulate/investment",
    roles: ["ADMIN", "CLIENT"],
    icon: "📈",
    description: "Rendimiento y proyección",
  },
  {
    label: "Admin Inversiones",
    href: "/admin/investments",
    roles: ["ADMIN"],
    icon: "⚙️",
    description: "Configurar productos",
  },
];

export default function AppShellClient({ children }: AppShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    setMounted(true);

    if (isLoginPage) return;

    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    setUser(getCurrentUser());
  }, [isLoginPage, pathname, router]);

  const visibleNavItems = useMemo(() => {
    if (!user) return [];

    return navItems.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.includes(user.role);
    });
  }, [user]);

  const currentPageTitle = useMemo(() => {
    const match = navItems.find((item) => pathname.startsWith(item.href));
    return match?.label ?? "SISCONTA";
  }, [pathname]);

  const currentPageDescription = useMemo(() => {
    const match = navItems.find((item) => pathname.startsWith(item.href));
    return match?.description ?? "Sistema financiero";
  }, [pathname]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-slate-300 shadow-xl backdrop-blur-xl">
          Cargando interfaz...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Overlay mobile */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 transform border-r border-white/10 bg-slate-950/85 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-400">
                  SISCONTA
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  Panel Financiero
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Créditos, inversiones y gestión administrativa
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
              >
                ✕
              </button>
            </div>
          </div>

          {/* User card */}
          <div className="px-5 py-5">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-lg shadow-black/20">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sesión activa
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-500/20">
                  {(user?.email?.[0] ?? "U").toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.email ?? "Usuario"}
                  </p>
                  <p className="mt-1 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    {user?.role ?? "ROLE"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="mb-3 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Navegación
              </p>
            </div>

            <nav className="space-y-2">
              {visibleNavItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group block rounded-2xl border px-4 py-3 transition-all ${
                      active
                        ? "border-indigo-400/30 bg-gradient-to-r from-indigo-500/20 to-violet-500/10 shadow-lg shadow-indigo-500/10"
                        : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
                          active
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-white/5 text-slate-300 group-hover:bg-white/10"
                        }`}
                      >
                        {item.icon}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            active ? "text-white" : "text-slate-200"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            active ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer actions */}
          <div className="border-t border-white/10 px-5 py-5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-80">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/55 backdrop-blur-2xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 shadow-sm transition hover:bg-white/10 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Módulo actual
                </p>
                <h2 className="truncate text-xl font-bold text-white">
                  {currentPageTitle}
                </h2>
                <p className="truncate text-sm text-slate-400">
                  {currentPageDescription}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {user?.email ?? "Usuario"}
                </p>
                <p className="text-xs text-slate-400">{user?.role ?? ""}</p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-[calc(100vh-5rem)] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}