"use client";

import { FormEvent, useEffect, useState } from "react";
import { getApiErrorInfo } from "@/lib/api/client";
import {
  createInvestmentProduct,
  listInvestmentProducts,
  updateInvestmentProduct,
} from "@/lib/investments/api";
import type {
  CapitalizationFrequency,
  InvestmentProduct,
} from "@/lib/investments/types";

type ProductFormState = {
  name: string;
  purpose: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  annualRate: string;
  allowOutOfMargin: boolean;
  capitalizationFreq: CapitalizationFrequency;
};

const defaultForm: ProductFormState = {
  name: "",
  purpose: "",
  minAmount: "300",
  maxAmount: "20000",
  minTermMonths: "3",
  maxTermMonths: "36",
  annualRate: "7.5",
  allowOutOfMargin: false,
  capitalizationFreq: "MONTHLY",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InvestmentAdmin() {
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [form, setForm] = useState<ProductFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listInvestmentProducts();
      setProducts(data);
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function loadToEdit(product: InvestmentProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      purpose: product.purpose ?? "",
      minAmount: String(product.minAmount),
      maxAmount: String(product.maxAmount),
      minTermMonths: String(product.minTermMonths),
      maxTermMonths: String(product.maxTermMonths),
      annualRate: String(product.annualRate),
      allowOutOfMargin: product.allowOutOfMargin,
      capitalizationFreq: product.capitalizationFreq,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name: form.name.trim(),
        purpose: form.purpose.trim(),
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        minTermMonths: Number(form.minTermMonths),
        maxTermMonths: Number(form.maxTermMonths),
        annualRate: Number(form.annualRate),
        allowOutOfMargin: form.allowOutOfMargin,
        capitalizationFreq: form.capitalizationFreq,
      };

      if (payload.minAmount > payload.maxAmount) {
        throw new Error("El monto mínimo no puede ser mayor al monto máximo.");
      }

      if (payload.minTermMonths > payload.maxTermMonths) {
        throw new Error("El plazo mínimo no puede ser mayor al plazo máximo.");
      }

      if (editingId) {
        await updateInvestmentProduct(editingId, payload);
        setSuccessMessage("Producto actualizado correctamente.");
      } else {
        await createInvestmentProduct(payload);
        setSuccessMessage("Producto creado correctamente.");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      } else {
        const info = getApiErrorInfo(error);
        setErrorMessage(`[${info.status}] ${info.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        <header className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
          <div className="relative px-6 py-10 text-center sm:px-8 lg:px-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              SISCONTA · ADMIN
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              <span className="bg-gradient-to-r from-white via-violet-200 to-indigo-300 bg-clip-text text-transparent">
                Productos de Inversión
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
              Configura montos, plazos, tasa anual, capitalización y reglas de
              simulación fuera de margen.
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

        {successMessage ? (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {successMessage}
            </div>
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
            {/* Formulario */}
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-lg xl:sticky xl:top-6 xl:self-start">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Editar producto" : "Crear producto"}
              </h2>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-300">
                    Nombre
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-300">
                    Propósito
                  </span>
                  <input
                    value={form.purpose}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, purpose: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Monto mínimo
                    </span>
                    <input
                      type="number"
                      value={form.minAmount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          minAmount: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Monto máximo
                    </span>
                    <input
                      type="number"
                      value={form.maxAmount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxAmount: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Plazo mínimo
                    </span>
                    <input
                      type="number"
                      value={form.minTermMonths}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          minTermMonths: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Plazo máximo
                    </span>
                    <input
                      type="number"
                      value={form.maxTermMonths}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxTermMonths: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Tasa anual (%)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.annualRate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          annualRate: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-300">
                      Capitalización
                    </span>
                    <select
                      value={form.capitalizationFreq}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          capitalizationFreq:
                            e.target.value as CapitalizationFrequency,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    >
                      <option value="MONTHLY" className="bg-slate-900">
                        MONTHLY
                      </option>
                      <option value="QUARTERLY" className="bg-slate-900">
                        QUARTERLY
                      </option>
                      <option value="SEMIANNUAL" className="bg-slate-900">
                        SEMIANNUAL
                      </option>
                      <option value="ANNUAL" className="bg-slate-900">
                        ANNUAL
                      </option>
                    </select>
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.allowOutOfMargin}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        allowOutOfMargin: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5"
                  />
                  Permitir simulaciones fuera del margen configurado
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting
                      ? editingId
                        ? "Actualizando..."
                        : "Creando..."
                      : editingId
                      ? "Actualizar"
                      : "Crear"}
                  </button>

                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </article>

            {/* Lista */}
            <section className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
                <h2 className="text-lg font-semibold text-white">
                  Productos configurados
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Administra las opciones disponibles para el simulador de
                  inversión.
                </p>
              </div>

              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400 backdrop-blur-lg">
                  Cargando productos...
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-lg transition hover:border-white/15 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {product.purpose || "Sin propósito definido"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => loadToEdit(product)}
                          className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                        >
                          Editar
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <MiniInfo
                          label="Monto"
                          value={`${formatCurrency(product.minAmount)} - ${formatCurrency(product.maxAmount)}`}
                        />
                        <MiniInfo
                          label="Plazo"
                          value={`${product.minTermMonths} - ${product.maxTermMonths} meses`}
                        />
                        <MiniInfo
                          label="Tasa anual"
                          value={`${product.annualRate}%`}
                        />
                        <MiniInfo
                          label="Capitalización"
                          value={product.capitalizationFreq}
                        />
                        <MiniInfo
                          label="Fuera de margen"
                          value={product.allowOutOfMargin ? "Sí" : "No"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}