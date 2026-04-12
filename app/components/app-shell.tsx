import { ReactNode } from "react";
import AppShellClient from "./app-shell-client";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return <AppShellClient>{children}</AppShellClient>;
}