"use client";

import { useState } from "react";
import type {
  SimulationResult,
  AmortizationMethod,
  IndirectChargeInput,
} from "@/lib/credit/types";

// ============================================================
// Tipos de crédito disponibles (se pueden traer de BD a futuro)
// ============================================================
const CREDIT_TYPES = [
  { name: "Consumo", defaultRate: 16.77 },
  { name: "Hipotecario", defaultRate: 10.33 },
  { name: "Educación", defaultRate: 9.33 },
  { name: "Microcrédito", defaultRate: 22.0 },
  { name: "Productivo", defaultRate: 9.33 },
  { name: "Inmobiliario", defaultRate: 10.33 },
];

// ============================================================
// Componente principal
// ============================================================
export default function CreditSimulatorPage() {
  // Form state
  const [amount, setAmount] = useState<string>("10000");
  const [termMonths, setTermMonths] = useState<string>("12");
  const [annualRate, setAnnualRate] = useState<string>("16.77");
  const [method, setMethod] = useState<AmortizationMethod>("FRENCH");
  const [creditType, setCreditType] = useState<string>("Consumo");
  const [additionalCharges, setAdditionalCharges] = useState<
    IndirectChargeInput[]
  >([]);
  const [showChargesForm, setShowChargesForm] = useState(false);

  // New charge form
  const [newChargeName, setNewChargeName] = useState("");
  const [newChargeType, setNewChargeType] = useState<"FIXED" | "PERCENTAGE">(
    "FIXED"
  );
  const [newChargeValue, setNewChargeValue] = useState("");

  // Result state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------

  function handleCreditTypeChange(name: string) {
    setCreditType(name);
    const found = CREDIT_TYPES.find((ct) => ct.name === name);
    if (found) setAnnualRate(String(found.defaultRate));
  }

  function addCharge() {
    if (!newChargeName || !newChargeValue) return;
    setAdditionalCharges((prev) => [
      ...prev,
      {
        name: newChargeName,
        type: newChargeType,
        value: parseFloat(newChargeValue),
        mandatory: false,
      },
    ]);
    setNewChargeName("");
    setNewChargeValue("");
  }

  function removeCharge(index: number) {
    setAdditionalCharges((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/simulate/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          termMonths: parseInt(termMonths, 10),
          annualInterestRate: parseFloat(annualRate),
          amortizationMethod: method,
          creditTypeName: creditType,
          additionalCharges,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al simular");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // Format currency
  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* ═══════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">
            SisConta · Ecuador
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Simulador de Crédito
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Calcula tu tabla de amortización con los métodos Francés y Alemán.
            Incluye automáticamente el seguro obligatorio SOLCA.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[420px_1fr]">
          {/* ═══════════════════════════════════════════════════
              Formulario (sidebar)
          ═══════════════════════════════════════════════════ */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg lg:sticky lg:top-6 lg:self-start"
          >
            <h2 className="text-lg font-semibold text-white">
              Parámetros del Crédito
            </h2>

            {/* Tipo de crédito */}
            <fieldset>
              <label
                htmlFor="credit-type"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Tipo de crédito
              </label>
              <select
                id="credit-type"
                value={creditType}
                onChange={(e) => handleCreditTypeChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                {CREDIT_TYPES.map((ct) => (
                  <option key={ct.name} value={ct.name} className="bg-slate-900">
                    {ct.name} ({ct.defaultRate}%)
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Monto */}
            <fieldset>
              <label
                htmlFor="amount"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Monto del crédito (USD)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </fieldset>

            {/* Plazo */}
            <fieldset>
              <label
                htmlFor="term"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Plazo (meses)
              </label>
              <input
                id="term"
                type="number"
                min="1"
                max="600"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </fieldset>

            {/* Tasa */}
            <fieldset>
              <label
                htmlFor="rate"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Tasa de interés anual (%)
              </label>
              <input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </fieldset>

            {/* Método */}
            <fieldset>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Método de amortización
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["FRENCH", "GERMAN"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      method === m
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/10"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {m === "FRENCH" ? "Francés" : "Alemán"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {method === "FRENCH"
                  ? "Cuota fija: pagas lo mismo cada mes."
                  : "Capital fijo: las cuotas van disminuyendo."}
              </p>
            </fieldset>

            {/* ── Cobros adicionales ── */}
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowChargesForm(!showChargesForm)}
                className="flex w-full items-center justify-between text-sm font-medium text-slate-300 transition hover:text-white"
              >
                <span>Cobros adicionales ({additionalCharges.length})</span>
                <svg
                  className={`h-4 w-4 transition-transform ${showChargesForm ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showChargesForm && (
                <div className="mt-4 space-y-3">
                  {/* Lista de cobros añadidos */}
                  {additionalCharges.map((charge, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="text-slate-300">
                        {charge.name} —{" "}
                        {charge.type === "FIXED"
                          ? `$${charge.value}/mes`
                          : `${charge.value}% anual`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCharge(i)}
                        className="text-red-400 transition hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Formulario para nuevo cobro */}
                  <div className="space-y-2 rounded-lg border border-dashed border-white/10 p-3">
                    <input
                      type="text"
                      placeholder="Nombre del cobro"
                      value={newChargeName}
                      onChange={(e) => setNewChargeName(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newChargeType}
                        onChange={(e) =>
                          setNewChargeType(
                            e.target.value as "FIXED" | "PERCENTAGE"
                          )
                        }
                        className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                      >
                        <option value="FIXED" className="bg-slate-900">
                          Fijo (USD/mes)
                        </option>
                        <option value="PERCENTAGE" className="bg-slate-900">
                          Porcentaje (% anual)
                        </option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Valor"
                        value={newChargeValue}
                        onChange={(e) => setNewChargeValue(e.target.value)}
                        className="w-24 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCharge}
                      className="w-full rounded-md border border-indigo-500/30 bg-indigo-500/10 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      + Añadir cobro
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Calculando…
                </span>
              ) : (
                "Simular Crédito"
              )}
            </button>

            {/* Nota SOLCA */}
            <p className="text-center text-[10px] text-slate-500">
              * El seguro SOLCA (0.5% anual) se incluye automáticamente en todos
              los créditos como cobro obligatorio.
            </p>
          </form>

          {/* ═══════════════════════════════════════════════════
              Resultados
          ═══════════════════════════════════════════════════ */}
          <section className="space-y-8">
            {!result && !loading && (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <svg
                    className="h-8 w-8 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  Configura los parámetros y presiona{" "}
                  <strong className="text-slate-400">Simular Crédito</strong>
                </p>
              </div>
            )}

            {result && (
              <>
                {/* ── Resumen en tarjetas ── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Cuota promedio"
                    value={`$${fmt(result.totalPayment / result.termMonths)}`}
                    sublabel={
                      result.method === "FRENCH"
                        ? "Fija (método Francés)"
                        : "Promedio (método Alemán)"
                    }
                    accent="indigo"
                  />
                  <SummaryCard
                    label="Total a pagar"
                    value={`$${fmt(result.totalPayment)}`}
                    sublabel={`Capital + Intereses + Cobros`}
                    accent="violet"
                  />
                  <SummaryCard
                    label="Total intereses"
                    value={`$${fmt(result.totalInterest)}`}
                    sublabel={`Tasa: ${result.annualInterestRate}% anual`}
                    accent="amber"
                  />
                  <SummaryCard
                    label="Total cobros"
                    value={`$${fmt(result.totalCharges)}`}
                    sublabel={`${result.charges.length} cobro(s) aplicado(s)`}
                    accent="emerald"
                  />
                </div>

                {/* ── Info del crédito ── */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Información del Crédito
                  </h3>
                  <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem label="Tipo" value={result.creditType} />
                    <InfoItem
                      label="Método"
                      value={
                        result.method === "FRENCH"
                          ? "Francés (cuota fija)"
                          : "Alemán (capital constante)"
                      }
                    />
                    <InfoItem label="Monto" value={`$${fmt(result.amount)}`} />
                    <InfoItem
                      label="Plazo"
                      value={`${result.termMonths} meses`}
                    />
                    <InfoItem
                      label="Tasa anual"
                      value={`${result.annualInterestRate}%`}
                    />
                    <InfoItem
                      label="Tasa mensual"
                      value={`${result.monthlyRate}%`}
                    />
                  </div>
                </div>

                {/* ── Detalle de cobros indirectos ── */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Cobros Indirectos Aplicados
                  </h3>
                  <div className="space-y-2">
                    {result.charges.map((charge, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          {charge.mandatory && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                              Obligatorio
                            </span>
                          )}
                          <span className="text-sm text-slate-200">
                            {charge.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            ${fmt(charge.monthlyAmount)}/mes
                          </p>
                          <p className="text-xs text-slate-500">
                            {charge.type === "FIXED"
                              ? `$${charge.value} fijo`
                              : `${charge.value}% anual`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Tabla de amortización ── */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg">
                  <div className="border-b border-white/10 px-6 py-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Tabla de Amortización
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-3">N°</th>
                          <th className="px-6 py-3 text-right">Cuota</th>
                          <th className="px-6 py-3 text-right">Capital</th>
                          <th className="px-6 py-3 text-right">Interés</th>
                          <th className="px-6 py-3 text-right">Cobros</th>
                          <th className="px-6 py-3 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {result.schedule.map((row) => (
                          <tr
                            key={row.period}
                            className="transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-6 py-3 font-medium text-slate-400">
                              {row.period}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-white">
                              ${fmt(row.payment)}
                            </td>
                            <td className="px-6 py-3 text-right text-indigo-300">
                              ${fmt(row.principal)}
                            </td>
                            <td className="px-6 py-3 text-right text-amber-300">
                              ${fmt(row.interest)}
                            </td>
                            <td className="px-6 py-3 text-right text-emerald-300">
                              ${fmt(row.charges)}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-300">
                              ${fmt(row.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 bg-white/[0.02] font-semibold">
                          <td className="px-6 py-3 text-slate-400">Total</td>
                          <td className="px-6 py-3 text-right text-white">
                            ${fmt(result.totalPayment)}
                          </td>
                          <td className="px-6 py-3 text-right text-indigo-300">
                            ${fmt(result.amount)}
                          </td>
                          <td className="px-6 py-3 text-right text-amber-300">
                            ${fmt(result.totalInterest)}
                          </td>
                          <td className="px-6 py-3 text-right text-emerald-300">
                            ${fmt(result.totalCharges)}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-500">
                            —
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function SummaryCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: "indigo" | "violet" | "amber" | "emerald";
}) {
  const accentStyles = {
    indigo:
      "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 shadow-indigo-500/5",
    violet:
      "from-violet-500/20 to-violet-600/5 border-violet-500/20 shadow-violet-500/5",
    amber:
      "from-amber-500/20 to-amber-600/5 border-amber-500/20 shadow-amber-500/5",
    emerald:
      "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 shadow-emerald-500/5",
  };

  const textStyles = {
    indigo: "text-indigo-300",
    violet: "text-violet-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-lg backdrop-blur-lg transition-transform hover:scale-[1.02] ${accentStyles[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${textStyles[accent]}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
