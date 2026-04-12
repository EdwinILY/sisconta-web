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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold tracking-widest text-slate-700">
            SISCONTA · DEV 3
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Administración de productos de inversión
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configura montos, plazos, tasa anual y la bandera de fuera de margen.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? "Editar producto" : "Crear producto"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Nombre
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Propósito
                <input
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Monto mínimo
                <input
                  type="number"
                  value={form.minAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, minAmount: e.target.value }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Monto máximo
                <input
                  type="number"
                  value={form.maxAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxAmount: e.target.value }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Plazo mínimo
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Plazo máximo
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Tasa anual (%)
                <input
                  type="number"
                  step="0.01"
                  value={form.annualRate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, annualRate: e.target.value }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Capitalización
                <select
                  value={form.capitalizationFreq}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      capitalizationFreq:
                        e.target.value as CapitalizationFrequency,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="SEMIANNUAL">SEMIANNUAL</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </label>

              <label className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.allowOutOfMargin}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowOutOfMargin: e.target.checked,
                    }))
                  }
                />
                Permitir simulaciones fuera del margen configurado
              </label>

              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {editingId ? "Actualizar" : "Crear"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Productos configurados
            </h2>

            {isLoading ? (
              <div className="mt-4 text-sm text-slate-500">
                Cargando productos...
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {product.purpose}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatCurrency(product.minAmount)} -{" "}
                          {formatCurrency(product.maxAmount)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {product.minTermMonths} - {product.maxTermMonths} meses
                        </p>
                        <p className="text-xs text-slate-600">
                          Tasa anual: {product.annualRate}%
                        </p>
                        <p className="text-xs text-slate-600">
                          Fuera de margen:{" "}
                          {product.allowOutOfMargin ? "Sí" : "No"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => loadToEdit(product)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}