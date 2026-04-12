"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiErrorInfo } from "@/lib/api/client";
import {
  listInvestmentProducts,
  simulateInvestmentProduct,
} from "@/lib/investments/api";
import type {
  InvestmentProduct,
  InvestmentSimulationResult,
} from "@/lib/investments/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InvestmentSimulator() {
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [amount, setAmount] = useState("5000");
  const [termMonths, setTermMonths] = useState("12");
  const [result, setResult] = useState<InvestmentSimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await listInvestmentProducts();
        setProducts(data);

        if (data.length > 0) {
          setSelectedProductId(data[0].id);
        }
      } catch (error) {
        const info = getApiErrorInfo(error);
        setErrorMessage(`[${info.status}] ${info.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProducts();
  }, []);

  async function handleSimulate() {
    if (!selectedProductId) {
      setErrorMessage("Selecciona un producto para simular.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        amount: Number(amount),
        termMonths: Number(termMonths),
      };

      const simulation = await simulateInvestmentProduct(
        selectedProductId,
        payload
      );
      setResult(simulation);
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        <header className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
          <div className="relative px-6 py-10 text-center sm:px-8 lg:px-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
              SISCONTA · INVERSIONES
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                Simulador de Inversión
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
              Proyecta el crecimiento de tu capital según el producto, plazo y
              tasa configurada.
            </p>
          </div>
        </header>

        {errorMessage ? (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="px-4 py-10 text-center sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-slate-400 backdrop-blur-lg">
              Cargando productos de inversión...
            </div>
          </div>
        ) : (
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              {/* Panel izquierdo */}
              <article className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-lg xl:sticky xl:top-6 xl:self-start">
                <h2 className="text-lg font-semibold text-white">
                  Parámetros de la inversión
                </h2>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Producto
                    </span>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="" className="bg-slate-900">
                        Selecciona un producto
                      </option>
                      {products.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                          className="bg-slate-900"
                        >
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Monto
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Plazo (meses)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                </div>

                {selectedProduct ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Configuración del producto
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      <p>
                        <strong className="text-white">Monto:</strong>{" "}
                        {formatCurrency(selectedProduct.minAmount)} -{" "}
                        {formatCurrency(selectedProduct.maxAmount)}
                      </p>
                      <p>
                        <strong className="text-white">Plazo:</strong>{" "}
                        {selectedProduct.minTermMonths} -{" "}
                        {selectedProduct.maxTermMonths} meses
                      </p>
                      <p>
                        <strong className="text-white">Tasa anual:</strong>{" "}
                        {selectedProduct.annualRate}%
                      </p>
                      <p>
                        <strong className="text-white">Capitalización:</strong>{" "}
                        {selectedProduct.capitalizationFreq}
                      </p>
                      <p>
                        <strong className="text-white">Fuera de margen:</strong>{" "}
                        {selectedProduct.allowOutOfMargin
                          ? "Permitido"
                          : "No permitido"}
                      </p>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleSimulate()}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-cyan-500 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? "Simulando..." : "Simular inversión"}
                </button>
              </article>

              {/* Panel derecho */}
              <section className="min-w-0 space-y-8">
                {!result ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
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
                          d="M12 8c-2.761 0-5 2.239-5 5m5-5c2.761 0 5 2.239 5 5m-5-5V4m0 9v7m0 0-3-3m3 3 3-3"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">
                      Selecciona un producto y ejecuta la simulación para ver la
                      proyección de rendimiento.
                    </p>
                  </div>
                ) : (
                  <>
                    {result.outOfMargin ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                        Esta simulación está fuera del rango configurado del
                        producto, pero fue permitida porque{" "}
                        <strong>allowOutOfMargin</strong> está activo.
                      </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                      <StatCard
                        label="Monto inicial"
                        value={formatCurrency(result.amount)}
                        accent="emerald"
                      />
                      <StatCard
                        label="Plazo"
                        value={`${result.termMonths} meses`}
                        accent="cyan"
                      />
                      <StatCard
                        label="Interés total"
                        value={formatCurrency(result.totalInterest)}
                        accent="indigo"
                      />
                      <StatCard
                        label="Monto al vencimiento"
                        value={formatCurrency(result.maturityAmount)}
                        accent="violet"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Detalle de la simulación
                      </h3>

                      <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <InfoItem label="Producto" value={result.productName} />
                        <InfoItem
                          label="Tasa anual"
                          value={`${result.annualRate}%`}
                        />
                        <InfoItem
                          label="Tasa mensual"
                          value={`${result.monthlyRate}`}
                        />
                        <InfoItem
                          label="Capitalización"
                          value={result.capitalizationFreq}
                        />
                        <InfoItem
                          label="Fuera de margen"
                          value={result.outOfMargin ? "Sí" : "No"}
                        />
                        <InfoItem
                          label="Propósito"
                          value={result.purpose ?? "No especificado"}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg">
                      <div className="border-b border-white/10 px-6 py-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                          Proyección mensual
                        </h3>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                              <th className="px-6 py-3">Mes</th>
                              <th className="px-6 py-3 text-right">
                                Saldo inicial
                              </th>
                              <th className="px-6 py-3 text-right">
                                Interés
                              </th>
                              <th className="px-6 py-3 text-right">
                                Saldo final
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {result.projection.map((row) => (
                              <tr
                                key={row.month}
                                className="transition-colors hover:bg-white/[0.03]"
                              >
                                <td className="px-6 py-3 font-medium text-slate-300">
                                  {row.month}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-200">
                                  {formatCurrency(row.initialBalance)}
                                </td>
                                <td className="px-6 py-3 text-right text-emerald-300">
                                  {formatCurrency(row.interest)}
                                </td>
                                <td className="px-6 py-3 text-right font-medium text-white">
                                  {formatCurrency(row.finalBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "cyan" | "indigo" | "violet";
}) {
  const accentStyles = {
    emerald:
      "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 shadow-emerald-500/5",
    cyan:
      "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 shadow-cyan-500/5",
    indigo:
      "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 shadow-indigo-500/5",
    violet:
      "from-violet-500/20 to-violet-600/5 border-violet-500/20 shadow-violet-500/5",
  };

  const textStyles = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    indigo: "text-indigo-300",
    violet: "text-violet-300",
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