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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold tracking-widest text-teal-700">
            SISCONTA · DEV 3
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Simulador de inversión
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Selecciona un producto, ingresa monto y plazo, y revisa la proyección
            estimada del rendimiento.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Cargando productos de inversión...
          </div>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Parámetros
              </h2>

              <div className="mt-5 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Producto
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Monto
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Plazo (meses)
                  <input
                    type="number"
                    min={1}
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              {selectedProduct ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p>
                    <strong>Rango de monto:</strong>{" "}
                    {formatCurrency(selectedProduct.minAmount)} -{" "}
                    {formatCurrency(selectedProduct.maxAmount)}
                  </p>
                  <p className="mt-1">
                    <strong>Rango de plazo:</strong>{" "}
                    {selectedProduct.minTermMonths} -{" "}
                    {selectedProduct.maxTermMonths} meses
                  </p>
                  <p className="mt-1">
                    <strong>Tasa anual:</strong> {selectedProduct.annualRate}%
                  </p>
                  <p className="mt-1">
                    <strong>Capitalización:</strong>{" "}
                    {selectedProduct.capitalizationFreq}
                  </p>
                  <p className="mt-1">
                    <strong>Fuera de margen:</strong>{" "}
                    {selectedProduct.allowOutOfMargin
                      ? "Permitido"
                      : "No permitido"}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSimulate()}
                disabled={isSubmitting}
                className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Simulando..." : "Simular inversión"}
              </button>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Resultados
              </h2>

              {!result ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Aún no hay simulación. Ingresa los datos y presiona “Simular inversión”.
                </div>
              ) : (
                <>
                  {result.outOfMargin ? (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Esta simulación está fuera del rango configurado del producto,
                      pero fue permitida porque{" "}
                      <strong>allowOutOfMargin</strong> está activo.
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card label="Monto inicial" value={formatCurrency(result.amount)} />
                    <Card label="Plazo" value={`${result.termMonths} meses`} />
                    <Card
                      label="Interés total"
                      value={formatCurrency(result.totalInterest)}
                    />
                    <Card
                      label="Monto al vencimiento"
                      value={formatCurrency(result.maturityAmount)}
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Detalle de simulación
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <p className="text-sm text-slate-700">
                        <strong>Producto:</strong> {result.productName}
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>Tasa anual:</strong> {result.annualRate}%
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>Tasa mensual:</strong> {result.monthlyRate}
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>Capitalización:</strong>{" "}
                        {result.capitalizationFreq}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-160 border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Mes</th>
                          <th className="px-4 py-3 text-right">Saldo inicial</th>
                          <th className="px-4 py-3 text-right">Interés</th>
                          <th className="px-4 py-3 text-right">Saldo final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.projection.map((row) => (
                          <tr
                            key={row.month}
                            className="border-b border-slate-100 text-slate-700"
                          >
                            <td className="px-4 py-3">{row.month}</td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(row.initialBalance)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(row.interest)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(row.finalBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}