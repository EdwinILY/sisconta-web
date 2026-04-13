import { ReactNode, Suspense } from "react";
import AppShellClient from "./app-shell-client";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-4 text-slate-300">Cargando interfaz...</div>}>
      <AppShellClient>{children}</AppShellClient>
    </Suspense>
  );
}
