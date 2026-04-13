"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorInfo } from "@/lib/api/client";
import {
  createInvestmentProduct,
  createInvestmentRequest,
  getInvestmentRequest,
  listInvestmentProducts,
  listInvestmentRequests,
  simulateInvestmentProduct,
  updateInvestmentProduct,
  updateInvestmentRequestStatus,
  uploadInvestmentRequestDocument,
  validateInvestmentRequestBiometrics,
} from "@/lib/investments/api";
import { getCurrentUser, isAuthenticated, type User } from "@/lib/api/auth";
import { CapitalizationFrequency, InvestmentProduct, InvestmentRequest, InvestmentSimulationResult, RequestStatus } from "@/lib/investments/types";

type RoleView = "CLIENT" | "ADMIN";

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

const defaultProductForm: ProductFormState = {
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

const statusFlow: RequestStatus[] = ["PENDING", "DOCUMENTS_UPLOADED", "BIOMETRIC_VALIDATED", "APPROVED"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function labelStatus(status: RequestStatus) {
  const labels: Record<RequestStatus, string> = {
    PENDING: "Pendiente",
    DOCUMENTS_UPLOADED: "Documentos subidos",
    BIOMETRIC_VALIDATED: "Biometria validada",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  };

  return labels[status];
}

function parseRequiredNumber(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`El campo ${label} es invalido.`);
  }
  return parsed;
}

export default function InvestmentsDev4() {
  const [view, setView] = useState<RoleView>("CLIENT");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [simulationAmount, setSimulationAmount] = useState("5000");
  const [simulationTerm, setSimulationTerm] = useState("12");
  const [simulation, setSimulation] = useState<InvestmentSimulationResult | null>(null);
  const [activeRequest, setActiveRequest] = useState<InvestmentRequest | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [documentType, setDocumentType] = useState("IDENTITY");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [biometricModality, setBiometricModality] = useState<"FACE" | "VOICE" | "FINGERPRINT">("FACE");
  const [biometricResult, setBiometricResult] = useState<"SUCCESS" | "FAILED">("SUCCESS");

  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? null, [products, selectedProductId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      setErrorMessage("Sesion no valida. Inicia sesion nuevamente.");
      return;
    }

    const user = getCurrentUser();
    setCurrentUser(user);

    if (user?.role === "ADMIN") {
      setView("ADMIN");
    } else {
      setView("CLIENT");
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const productData = await listInvestmentProducts();

      let requestData: InvestmentRequest[] = [];
      try {
        requestData = await listInvestmentRequests();
      } catch {
        requestData = [];
      }

      setProducts(productData);
      setRequests(requestData);

      if (!selectedProductId && productData[0]) {
        setSelectedProductId(productData[0].id);
      }
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  function setSuccess(message: string) {
    setSuccessMessage(message);
    setErrorMessage(null);
  }

  function setError(error: unknown) {
    const info = getApiErrorInfo(error);
    setErrorMessage(`[${info.status}] ${info.message}`);
    setSuccessMessage(null);
  }

  async function handleSimulate() {
    if (!selectedProductId) {
      setErrorMessage("Selecciona un producto para simular.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const payload = {
        amount: parseRequiredNumber(simulationAmount, "monto"),
        termMonths: parseRequiredNumber(simulationTerm, "plazo"),
      };

      const result = await simulateInvestmentProduct(selectedProductId, payload);
      setSimulation(result);
      setSuccess("Simulacion generada correctamente.");
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateRequest() {
    if (!selectedProductId) {
      setErrorMessage("No hay producto seleccionado para crear solicitud.");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("Debes aceptar terminos y condiciones para continuar.");
      return;
    }

    if (!currentUser?.id) {
      setErrorMessage("No se pudo identificar el usuario autenticado.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const request = await createInvestmentRequest({
        userId: currentUser.id,
        productId: selectedProductId,
        amount: parseRequiredNumber(simulationAmount, "monto"),
        termMonths: parseRequiredNumber(simulationTerm, "plazo"),
        acceptTerms: true,
      });

      setActiveRequest(request);
      await refreshAllData();
      setSuccess(`Solicitud creada con estado ${labelStatus(request.status)}.`);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeRequest?.id) {
      setErrorMessage("Primero crea o selecciona una solicitud.");
      return;
    }

    if (!documentFile) {
      setErrorMessage("Selecciona un archivo para subir.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const updated = await uploadInvestmentRequestDocument(activeRequest.id, documentType, documentFile);
      setActiveRequest(updated);
      setDocumentFile(null);
      await refreshAllData();
      setSuccess("Documento cargado correctamente.");
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBiometricValidation() {
    if (!activeRequest?.id) {
      setErrorMessage("Primero crea o selecciona una solicitud.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const updated = await validateInvestmentRequestBiometrics(activeRequest.id, {
        modality: biometricModality,
        forceResult: biometricResult,
        metadata: {
          confidence: biometricResult === "SUCCESS" ? 0.98 : 0.42,
          provider: "mock-provider",
        },
      });
      setActiveRequest(updated);
      await refreshAllData();
      setSuccess(`Biometria procesada. Estado actual: ${labelStatus(updated.status)}.`);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function selectRequest(requestId: string) {
    setIsSubmitting(true);

    try {
      const request = await getInvestmentRequest(requestId);
      setActiveRequest(request);
      setSuccess(`Solicitud ${request.id.slice(0, 8)} cargada.`);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdminStatusUpdate(requestId: string, status: Extract<RequestStatus, "APPROVED" | "REJECTED">) {
    if (currentUser?.role !== "ADMIN") {
      setErrorMessage("Solo un administrador puede aprobar o rechazar solicitudes.");
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await updateInvestmentRequestStatus(requestId, status);

      if (activeRequest?.id === requestId) {
        setActiveRequest(updated);
      }

      await refreshAllData();
      setSuccess(`Solicitud actualizada a ${labelStatus(updated.status)}.`);
    } catch (error) {
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetProductForm() {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
  }

  function loadProductToForm(product: InvestmentProduct) {
    setProductForm({
      name: product.name,
      purpose: product.purpose || "",
      minAmount: String(product.minAmount),
      maxAmount: String(product.maxAmount),
      minTermMonths: String(product.minTermMonths),
      maxTermMonths: String(product.maxTermMonths),
      annualRate: String(product.annualRate),
      allowOutOfMargin: product.allowOutOfMargin,
      capitalizationFreq: product.capitalizationFreq,
    });
    setEditingProductId(product.id);
    setView("ADMIN");
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentUser?.role !== "ADMIN") {
      setErrorMessage("Solo un administrador puede gestionar productos de inversion.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: productForm.name.trim(),
        purpose: productForm.purpose.trim(),
        minAmount: parseRequiredNumber(productForm.minAmount, "monto minimo"),
        maxAmount: parseRequiredNumber(productForm.maxAmount, "monto maximo"),
        minTermMonths: parseRequiredNumber(productForm.minTermMonths, "plazo minimo"),
        maxTermMonths: parseRequiredNumber(productForm.maxTermMonths, "plazo maximo"),
        annualRate: parseRequiredNumber(productForm.annualRate, "tasa anual"),
        allowOutOfMargin: productForm.allowOutOfMargin,
        capitalizationFreq: productForm.capitalizationFreq,
      };

      if (payload.minAmount > payload.maxAmount) {
        throw new Error("El monto minimo no puede ser mayor al maximo.");
      }

      if (payload.minTermMonths > payload.maxTermMonths) {
        throw new Error("El plazo minimo no puede ser mayor al maximo.");
      }

      if (editingProductId) {
        await updateInvestmentProduct(editingProductId, payload);
        setSuccess("Producto actualizado correctamente.");
      } else {
        await createInvestmentProduct(payload);
        setSuccess("Producto creado correctamente.");
      }

      resetProductForm();
      await refreshAllData();
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
        setSuccessMessage(null);
      } else {
        setError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepState = useMemo(() => {
    const status = activeRequest?.status;

    if (!status) {
      return 1;
    }

    if (status === "REJECTED") {
      return 4;
    }

    return Math.max(1, statusFlow.indexOf(status) + 1);
  }, [activeRequest?.status]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <p className="text-sm font-semibold tracking-widest text-teal-700">SISCONTA · DEV4</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Modulo de inversiones</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Simulacion, solicitud en linea, carga de documentos, validacion biometrica mock y gestion administrativa del estado final.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setView("CLIENT")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "CLIENT" ? "bg-teal-700 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
            Vista cliente
          </button>
          {currentUser?.role === "ADMIN" ? (
            <button type="button" onClick={() => setView("ADMIN")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "ADMIN" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
              Vista administrador
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void refreshAllData();
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refrescar datos
          </button>
        </div>
      </header>

      {errorMessage ? <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
      {successMessage ? <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

      {isLoading ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Cargando configuraciones y solicitudes...</div> : null}

      {!isLoading && view === "CLIENT" ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <article className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">1) Simulacion de inversion</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona producto, monto y plazo para calcular rendimiento.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Producto
                <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Usuario
                <input value={currentUser?.email ?? "No identificado"} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Monto
                <input type="number" min={1} value={simulationAmount} onChange={(event) => setSimulationAmount(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Plazo (meses)
                <input type="number" min={1} value={simulationTerm} onChange={(event) => setSimulationTerm(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
            </div>
            {activeProduct ? (
              <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Rango del producto: {formatCurrency(activeProduct.minAmount)} - {formatCurrency(activeProduct.maxAmount)} | {activeProduct.minTermMonths} - {activeProduct.maxTermMonths} meses | Tasa anual {activeProduct.annualRate}%
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} />
                Acepto terminos y condiciones
              </label>
              <button
                type="button"
                onClick={() => {
                  void handleSimulate();
                }}
                disabled={isSubmitting}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Simular
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCreateRequest();
                }}
                disabled={isSubmitting}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Crear solicitud
              </button>
            </div>

            {simulation ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resultado de simulacion</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-slate-700">
                    Monto inicial: <strong>{formatCurrency(simulation.amount)}</strong>
                  </p>
                  <p className="text-sm text-slate-700">
                    Plazo: <strong>{simulation.termMonths} meses</strong>
                  </p>
                  <p className="text-sm text-slate-700">
                    Monto al vencimiento: <strong>{formatCurrency(simulation.maturityAmount)}</strong>
                  </p>
                  <p className="text-sm text-slate-700">
                    Interes total: <strong>{formatCurrency(simulation.totalInterest)}</strong>
                  </p>
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Flujo de 4 pasos</h2>
            <ol className="mt-4 space-y-3">
              {["Simulacion", "Solicitud", "Documentos", "Biometria"].map((step, index) => {
                const isDone = stepState > index + 1;
                const isActive = stepState === index + 1;

                return (
                  <li key={step} className={`rounded-xl border px-3 py-2 text-sm ${isDone ? "border-emerald-300 bg-emerald-50 text-emerald-700" : isActive ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500"}`}>
                    {index + 1}. {step}
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              Estado actual: <strong>{labelStatus(activeRequest?.status ?? "PENDING")}</strong>
            </div>

            {activeRequest ? (
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>ID solicitud: {activeRequest.id}</p>
                <p>Documentos: {activeRequest.documents?.length ?? 0}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Aun no has creado una solicitud.</p>
            )}
          </article>

          <article className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">2) Carga de documentos</h2>
            <form onSubmit={handleUploadDocument} className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Tipo
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="IDENTITY">IDENTITY</option>
                  <option value="INCOME_PROOF">INCOME_PROOF</option>
                  <option value="BANK_STATEMENT">BANK_STATEMENT</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Archivo
                <input type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <div className="sm:col-span-3">
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Subir documento
                </button>
              </div>
            </form>
          </article>

          <article className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">3) Validacion biometrica mock</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Modalidad
                <select value={biometricModality} onChange={(event) => setBiometricModality(event.target.value as "FACE" | "VOICE" | "FINGERPRINT")} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="FACE">FACE</option>
                  <option value="VOICE">VOICE</option>
                  <option value="FINGERPRINT">FINGERPRINT</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Resultado forzado
                <select value={biometricResult} onChange={(event) => setBiometricResult(event.target.value as "SUCCESS" | "FAILED")} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    void handleBiometricValidation();
                  }}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Ejecutar biometria
                </button>
              </div>
            </div>
          </article>

          <article className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Solicitudes existentes</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona una solicitud previa para continuar el flujo de documentos y biometria.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => {
                    void selectRequest(request.id);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-slate-400"
                >
                  <p className="text-xs text-slate-500">{request.id.slice(0, 8)}...</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{labelStatus(request.status)}</p>
                  <p className="text-xs text-slate-600">Monto: {formatCurrency(request.amount)}</p>
                </button>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!isLoading && view === "ADMIN" ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{editingProductId ? "Editar producto" : "Crear producto de inversion"}</h2>
            <form onSubmit={handleProductSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Nombre
                <input value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Proposito
                <input value={productForm.purpose} onChange={(event) => setProductForm((prev) => ({ ...prev, purpose: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Monto minimo
                <input type="number" value={productForm.minAmount} onChange={(event) => setProductForm((prev) => ({ ...prev, minAmount: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Monto maximo
                <input type="number" value={productForm.maxAmount} onChange={(event) => setProductForm((prev) => ({ ...prev, maxAmount: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Plazo minimo (meses)
                <input type="number" value={productForm.minTermMonths} onChange={(event) => setProductForm((prev) => ({ ...prev, minTermMonths: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Plazo maximo (meses)
                <input type="number" value={productForm.maxTermMonths} onChange={(event) => setProductForm((prev) => ({ ...prev, maxTermMonths: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Tasa anual (%)
                <input type="number" step="0.01" value={productForm.annualRate} onChange={(event) => setProductForm((prev) => ({ ...prev, annualRate: event.target.value }))} required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Capitalizacion
                <select
                  value={productForm.capitalizationFreq}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      capitalizationFreq: event.target.value as CapitalizationFrequency,
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
              <label className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={productForm.allowOutOfMargin}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      allowOutOfMargin: event.target.checked,
                    }))
                  }
                />
                Permitir valores fuera del margen configurado
              </label>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {editingProductId ? "Actualizar" : "Crear"}
                </button>
                {editingProductId ? (
                  <button type="button" onClick={resetProductForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Productos configurados</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-600">{product.purpose}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)} | {product.minTermMonths}-{product.maxTermMonths} meses
                      </p>
                    </div>
                    <button type="button" onClick={() => loadProductToForm(product)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Solicitudes para decision final</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-180 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Usuario</th>
                    <th className="px-2 py-2">Monto</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-2 py-3">{request.id.slice(0, 8)}...</td>
                      <td className="px-2 py-3">{request.userId.slice(0, 8)}...</td>
                      <td className="px-2 py-3">{formatCurrency(request.amount)}</td>
                      <td className="px-2 py-3">{labelStatus(request.status)}</td>
                      <td className="px-2 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleAdminStatusUpdate(request.id, "APPROVED");
                            }}
                            disabled={isSubmitting}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleAdminStatusUpdate(request.id, "REJECTED");
                            }}
                            disabled={isSubmitting}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
