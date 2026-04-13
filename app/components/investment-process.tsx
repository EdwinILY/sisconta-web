"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getCurrentUser, isAuthenticated, type User } from "@/lib/api/auth";
import { getApiErrorInfo } from "@/lib/api/client";
import { createInvestmentRequest, getInvestmentRequest, listInvestmentProducts, listInvestmentRequests, updateInvestmentRequestStatus, uploadInvestmentRequestDocument, validateInvestmentRequestBiometrics } from "@/lib/investments/api";
import type { InvestmentProduct, InvestmentRequest, RequestStatus } from "@/lib/investments/types";

type ProcessView = "CLIENT" | "ADMIN";

type InvestmentProcessProps = {
  defaultView?: ProcessView;
};

const flowSteps: RequestStatus[] = ["PENDING", "DOCUMENTS_UPLOADED", "BIOMETRIC_VALIDATED", "APPROVED"];

function statusLabel(status: RequestStatus) {
  if (status === "PENDING") return "Pendiente";
  if (status === "DOCUMENTS_UPLOADED") return "Documentos cargados";
  if (status === "BIOMETRIC_VALIDATED") return "Biometría validada";
  if (status === "APPROVED") return "Aprobada";
  return "Rechazada";
}

function statusClass(status: RequestStatus) {
  if (status === "APPROVED") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (status === "REJECTED") return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  if (status === "BIOMETRIC_VALIDATED") return "text-cyan-300 border-cyan-500/30 bg-cyan-500/10";
  if (status === "DOCUMENTS_UPLOADED") return "text-indigo-300 border-indigo-500/30 bg-indigo-500/10";
  return "text-amber-300 border-amber-500/30 bg-amber-500/10";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InvestmentProcess({ defaultView = "CLIENT" }: InvestmentProcessProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ProcessView>(defaultView);

  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [amount, setAmount] = useState("5000");
  const [termMonths, setTermMonths] = useState("12");
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [activeRequestId, setActiveRequestId] = useState("");
  const [documentType, setDocumentType] = useState("IDENTITY");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [biometricModality, setBiometricModality] = useState<"FACE" | "VOICE" | "FINGERPRINT">("FACE");
  const [biometricResult, setBiometricResult] = useState<"SUCCESS" | "FAILED">("SUCCESS");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<InvestmentRequest | null>(null);

  const activeRequest = useMemo(() => {
    if (selectedRequestDetail && selectedRequestDetail.id === activeRequestId) {
      return selectedRequestDetail;
    }

    return requests.find((req) => req.id === activeRequestId) ?? null;
  }, [requests, activeRequestId, selectedRequestDetail]);

  const ownRequests = useMemo(() => {
    if (!currentUser) return [];
    return requests.filter((req) => req.userId === currentUser.id);
  }, [requests, currentUser]);

  useEffect(() => {
    if (!isAuthenticated()) {
      setErrorMessage("Sesión no válida. Inicia sesión nuevamente.");
      return;
    }

    const user = getCurrentUser();
    setCurrentUser(user);

    if (user?.role === "ADMIN") {
      setView(defaultView);
    } else {
      setView("CLIENT");
    }
  }, [defaultView]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const productsData = await listInvestmentProducts();
        setProducts(productsData);

        if (!selectedProductId && productsData.length > 0) {
          setSelectedProductId(productsData[0].id);
        }

        const requestsData = await listInvestmentRequests();
        setRequests(requestsData);

        if (!activeRequestId && requestsData.length > 0) {
          const first = currentUser?.role === "ADMIN" ? requestsData[0] : (requestsData.find((req) => req.userId === currentUser?.id) ?? null);
          if (first) setActiveRequestId(first.id);
        }
      } catch (error) {
        const info = getApiErrorInfo(error);
        setErrorMessage(`[${info.status}] ${info.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [currentUser, selectedProductId, activeRequestId]);

  async function refreshRequests() {
    try {
      const data = await listInvestmentRequests();
      setRequests(data);

      if (activeRequestId) {
        const updatedActive = data.find((req) => req.id === activeRequestId) ?? null;
        if (updatedActive) {
          setSelectedRequestDetail((prev) => ({ ...updatedActive, ...prev }));
        }
      }

      return data;
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
      return [];
    }
  }

  async function handleCreateRequest() {
    if (!currentUser?.id) {
      setErrorMessage("No se pudo identificar el usuario autenticado.");
      return;
    }

    if (!selectedProductId) {
      setErrorMessage("Selecciona un producto antes de crear la solicitud.");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("Debes aceptar términos y condiciones para continuar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const request = await createInvestmentRequest({
        userId: currentUser.id,
        productId: selectedProductId,
        amount: Number(amount),
        termMonths: Number(termMonths),
        acceptTerms: true,
      });

      setActiveRequestId(request.id);
      setSelectedRequestDetail(request);
      await refreshRequests();
      setSuccessMessage("Solicitud creada correctamente.");
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeRequestId) {
      setErrorMessage("Selecciona una solicitud para subir documentos.");
      return;
    }

    if (!documentFile) {
      setErrorMessage("Selecciona un archivo antes de subir.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await uploadInvestmentRequestDocument(activeRequestId, documentType, documentFile);
      await refreshRequests();
      setDocumentFile(null);
      setSuccessMessage("Documento cargado correctamente.");
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBiometricValidation() {
    if (!activeRequestId) {
      setErrorMessage("Selecciona una solicitud para validar biometría.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await validateInvestmentRequestBiometrics(activeRequestId, {
        modality: biometricModality,
        forceResult: biometricResult,
        metadata: {
          provider: "mock-provider",
          confidence: biometricResult === "SUCCESS" ? 0.98 : 0.44,
        },
      });
      await refreshRequests();
      setSuccessMessage("Biometría procesada correctamente.");
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectRequest(requestId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const request = await getInvestmentRequest(requestId);
      setActiveRequestId(request.id);
      setSelectedRequestDetail(request);
      setSuccessMessage("Detalle de solicitud cargado correctamente.");
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdminStatus(requestId: string, status: "APPROVED" | "REJECTED") {
    if (currentUser?.role !== "ADMIN") {
      setErrorMessage("Solo administradores pueden cambiar el estado final.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateInvestmentRequestStatus(requestId, status);
      await refreshRequests();
      setSuccessMessage(`Solicitud ${status === "APPROVED" ? "aprobada" : "rechazada"}.`);
    } catch (error) {
      const info = getApiErrorInfo(error);
      setErrorMessage(`[${info.status}] ${info.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const listForView = view === "ADMIN" ? requests : ownRequests;

  const stepIndex = useMemo(() => {
    if (!activeRequest) return 0;
    if (activeRequest.status === "REJECTED") return flowSteps.length;
    return Math.max(flowSteps.indexOf(activeRequest.status), 0);
  }, [activeRequest]);

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        <header className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
          <div className="relative px-6 py-8 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">SISCONTA · INVERSIONES</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Expediente digital de inversión</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Nuevo flujo por etapas: solicitud, carga documental, validación biométrica y aprobación final.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setView("CLIENT")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${view === "CLIENT" ? "bg-cyan-600 text-white" : "border border-white/10 bg-white/5 text-slate-300"}`}>
                Flujo cliente
              </button>
              {currentUser?.role === "ADMIN" ? (
                <button type="button" onClick={() => setView("ADMIN")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${view === "ADMIN" ? "bg-indigo-600 text-white" : "border border-white/10 bg-white/5 text-slate-300"}`}>
                  Mesa de validación (admin)
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{errorMessage}</div>
          </div>
        ) : null}

        {successMessage ? (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center text-slate-400 backdrop-blur-lg">Cargando expediente de inversiones...</div>
          </div>
        ) : (
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <section className="space-y-4 rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-lg xl:sticky xl:top-6 xl:self-start">
                <h3 className="text-lg font-semibold text-white">Estado de solicitud</h3>

                <div className="space-y-2">
                  {flowSteps.map((status, idx) => {
                    const active = idx === stepIndex;
                    const done = idx < stepIndex;
                    return (
                      <div key={status} className={`rounded-xl border px-3 py-2 text-sm ${done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : active ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
                        {idx + 1}. {statusLabel(status)}
                      </div>
                    );
                  })}
                  {activeRequest?.status === "REJECTED" ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Solicitud rechazada</div> : null}
                </div>

                {activeRequest ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                    <p>Solicitud: {activeRequest.id.slice(0, 8)}...</p>
                    <p className="mt-1">Monto: {formatCurrency(activeRequest.amount)}</p>
                    <p className="mt-1">Plazo: {activeRequest.termMonths} meses</p>
                    <p className="mt-1">Documentos: {activeRequest.documents?.length ?? 0}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No hay solicitud activa seleccionada.</p>
                )}
              </section>

              <section className="space-y-6">
                <article className="rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-lg">
                  <h3 className="text-lg font-semibold text-white">1) Crear solicitud</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Producto</span>
                      <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                        <option value="" className="bg-slate-900">
                          Selecciona producto
                        </option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id} className="bg-slate-900">
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Monto</span>
                      <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Plazo (meses)</span>
                      <input type="number" min={1} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                    </label>

                    <label className="flex items-end gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                      Acepto términos
                    </label>
                  </div>

                  <button type="button" onClick={() => void handleCreateRequest()} disabled={isSubmitting} className="mt-4 rounded-xl bg-linear-to-r from-cyan-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50">
                    Crear solicitud
                  </button>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-lg">
                  <h3 className="text-lg font-semibold text-white">2) Documentos</h3>
                  <form onSubmit={handleUploadDocument} className="mt-4 grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Tipo de documento</span>
                      <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                        <option value="IDENTITY" className="bg-slate-900">
                          IDENTITY
                        </option>
                        <option value="INCOME_PROOF" className="bg-slate-900">
                          INCOME_PROOF
                        </option>
                        <option value="BANK_STATEMENT" className="bg-slate-900">
                          BANK_STATEMENT
                        </option>
                      </select>
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-sm text-slate-300">Archivo</span>
                      <input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none" />
                    </label>

                    <div className="sm:col-span-3">
                      <button type="submit" disabled={isSubmitting} className="rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/25 disabled:opacity-50">
                        Subir documento
                      </button>
                    </div>
                  </form>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-lg">
                  <h3 className="text-lg font-semibold text-white">3) Validación biométrica</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Modalidad</span>
                      <select value={biometricModality} onChange={(e) => setBiometricModality(e.target.value as "FACE" | "VOICE" | "FINGERPRINT")} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                        <option value="FACE" className="bg-slate-900">
                          FACE
                        </option>
                        <option value="VOICE" className="bg-slate-900">
                          VOICE
                        </option>
                        <option value="FINGERPRINT" className="bg-slate-900">
                          FINGERPRINT
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm text-slate-300">Resultado de prueba</span>
                      <select value={biometricResult} onChange={(e) => setBiometricResult(e.target.value as "SUCCESS" | "FAILED")} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                        <option value="SUCCESS" className="bg-slate-900">
                          SUCCESS
                        </option>
                        <option value="FAILED" className="bg-slate-900">
                          FAILED
                        </option>
                      </select>
                    </label>

                    <div className="flex items-end">
                      <button type="button" onClick={() => void handleBiometricValidation()} disabled={isSubmitting} className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50">
                        Ejecutar biometría
                      </button>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-lg">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{view === "ADMIN" ? "Solicitudes del sistema" : "Mis solicitudes"}</h3>
                  </div>

                  {listForView.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No hay solicitudes para mostrar.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {listForView.map((req) => (
                        <div key={req.id} className={`rounded-xl border p-4 ${req.id === activeRequestId ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">Solicitud {req.id.slice(0, 8)}...</p>
                              <p className="mt-1 text-xs text-slate-400">
                                Monto: {formatCurrency(req.amount)} · Plazo: {req.termMonths} meses
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(req.status)}`}>{statusLabel(req.status)}</span>
                              <button type="button" onClick={() => void handleSelectRequest(req.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
                                Ver detalle
                              </button>
                              {view === "ADMIN" ? (
                                <>
                                  <button type="button" onClick={() => void handleAdminStatus(req.id, "APPROVED")} disabled={isSubmitting} className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-50">
                                    Aprobar
                                  </button>
                                  <button type="button" onClick={() => void handleAdminStatus(req.id, "REJECTED")} disabled={isSubmitting} className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-50">
                                    Rechazar
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeRequest ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <h4 className="text-sm font-semibold text-white">Detalle seleccionado</h4>
                      <div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                        <p>ID: {activeRequest.id}</p>
                        <p>Usuario: {activeRequest.userId}</p>
                        <p>Producto: {activeRequest.productId}</p>
                        <p>Estado: {statusLabel(activeRequest.status)}</p>
                        <p>Monto: {formatCurrency(activeRequest.amount)}</p>
                        <p>Plazo: {activeRequest.termMonths} meses</p>
                        <p>Términos aceptados: {activeRequest.acceptTerms ? "Sí" : "No"}</p>
                        <p>Documentos: {activeRequest.documents?.length ?? 0}</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
