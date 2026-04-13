"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isAuthenticated, login } from "@/lib/api/auth";
import { ApiErrorInfo } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) return;

    const user = getCurrentUser();

    if (user?.role === "ADMIN") {
      router.replace("/admin/investments");
      return;
    }

    router.replace("/simulate/credit");
  }, [router]);

  useEffect(() => {
    if (!error) return;

    const timeout = setTimeout(() => {
      setError("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!success) return;

    const timeout = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [success]);

  const validateForm = (): boolean => {
    let isValid = true;

    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("El email es requerido");
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError("La contraseña es requerida");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await login(email, password);

      setSuccess("¡Login exitoso!");

      setTimeout(() => {
        if (response.user.role === "ADMIN") {
          router.push("/admin/investments");
        } else if (response.user.role === "CLIENT") {
          router.push("/simulate/credit");
        } else {
          router.push("/");
        }
      }, 500);
    } catch (err) {
      const apiError = err as ApiErrorInfo;
      setError(apiError.message || "Error en el login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/4 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">SISCONTA</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-400">Sistema Financiero Integral</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
            <p className="text-sm font-medium text-rose-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-medium text-emerald-300">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              className={`w-full rounded-xl border px-4 py-2.5 outline-none transition ${
                emailError ? "border-rose-400/70 bg-rose-500/10 text-rose-100 focus:ring-2 focus:ring-rose-500/20" : "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            />
            {emailError && <p className="mt-1 text-sm text-rose-300">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
              Contraseña <span className="text-rose-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className={`w-full rounded-xl border px-4 py-2.5 outline-none transition ${
                passwordError ? "border-rose-400/70 bg-rose-500/10 text-rose-100 focus:ring-2 focus:ring-rose-500/20" : "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            />
            {passwordError && <p className="mt-1 text-sm text-rose-300">{passwordError}</p>}
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-600 to-teal-600 py-3 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">¿No tienes cuenta? Contacta con el administrador</p>
      </div>
    </div>
  );
}
