"use client";

import { useState, useRef, useEffect } from "react";
import type {
  SimulationResult,
  AmortizationMethod,
  IndirectChargeInput,
} from "@/lib/credit/types";
import { simulate } from "@/lib/credit";
import { downloadCreditPDF, buildCompanyInfo, type DownloadMode, type CompanyInfo } from "@/lib/pdf";
import { getCreditTypes, type CreditType } from "@/lib/api/credit-types";
import { getChargesByCreditType, type Charge } from "@/lib/api/charges";
import { getInstitution, type Institution } from "@/lib/api/institution";
import { baseURL } from "@/lib/api/client";

export default function CreditSimulatorPage() {
  // ── Datos dinámicos del API ──
  const [creditTypes, setCreditTypes] = useState<CreditType[]>([]);
  const [selectedCreditType, setSelectedCreditType] = useState<CreditType | null>(null);
  const [dbCharges, setDbCharges] = useState<Charge[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | undefined>(undefined);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ── Estado del formulario ──
  const [amount, setAmount] = useState<string>("10000");
  const [termMonths, setTermMonths] = useState<string>("12");
  const [annualRate, setAnnualRate] = useState<string>("");
  const [method, setMethod] = useState<AmortizationMethod>("FRENCH");
  const [additionalCharges, setAdditionalCharges] = useState<
    IndirectChargeInput[]
  >([]);
  const [showChargesForm, setShowChargesForm] = useState(false);

  const [newChargeName, setNewChargeName] = useState("");
  const [newChargeType, setNewChargeType] = useState<"FIXED" | "PERCENTAGE">(
    "FIXED"
  );
  const [newChargeValue, setNewChargeValue] = useState("");

  // ── Estado de resultados ──
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [resultFrench, setResultFrench] = useState<SimulationResult | null>(null);
  const [resultGerman, setResultGerman] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Estado de descarga ──
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // ── Cargar datos iniciales del API ──
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      setDataError(null);
      try {
        const [types, inst] = await Promise.all([
          getCreditTypes(),
          getInstitution().catch(() => null),
        ]);

        setCreditTypes(types);
        setInstitution(inst);

        // Construir CompanyInfo para el PDF
        if (inst) {
          let logoFullUrl: string | undefined = undefined;
          const rawLogo = inst.logoUrl || inst.logo;
          if (rawLogo) {
            let path = rawLogo;
            if (!path.startsWith("http") && !path.startsWith("data:")) {
              path = path.replace(/\\/g, "/");
              if (!path.startsWith("/")) path = "/" + path;
              logoFullUrl = `${baseURL}${path}`;
            } else {
              logoFullUrl = path;
            }
          }

          setCompanyInfo(
            buildCompanyInfo({
              name: inst.name,
              ruc: inst.ruc,
              contact: inst.contact,
              logoUrl: logoFullUrl,
            })
          );
        }

        // Seleccionar primer tipo de crédito si existe
        if (types.length > 0) {
          const first = types[0];
          setSelectedCreditType(first);
          setAnnualRate(first.annualInterestRate.toString());
          // Seleccionar primer método disponible
          if (first.amortizationSystems.length > 0) {
            setMethod(first.amortizationSystems[0] as AmortizationMethod);
          }
          // Cargar cobros del primer tipo
          try {
            const charges = await getChargesByCreditType(first.id);
            setDbCharges(charges);
          } catch {
            setDbCharges([]);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
        setDataError("No se pudieron cargar los datos. Verifica la conexión con el servidor.");
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Cerrar menú de descarga al hacer clic fuera ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setShowDownloadMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Cambiar tipo de crédito ──
  async function handleCreditTypeChange(creditTypeId: string) {
    const found = creditTypes.find((ct) => ct.id === creditTypeId);
    if (!found) return;

    setSelectedCreditType(found);
    setAnnualRate(found.annualInterestRate.toString());

    // Limitar método de amortización a los disponibles
    if (found.amortizationSystems.length > 0 && !found.amortizationSystems.includes(method)) {
      setMethod(found.amortizationSystems[0] as AmortizationMethod);
    }

    // Cargar cobros del tipo seleccionado
    try {
      const charges = await getChargesByCreditType(found.id);
      setDbCharges(charges);
    } catch {
      setDbCharges([]);
    }

    // Limpiar resultados anteriores
    setResult(null);
    setResultFrench(null);
    setResultGerman(null);
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

  // ── Cobros obligatorios de la BD convertidos al formato del motor ──
  function getDbChargesAsInputs(): IndirectChargeInput[] {
    return dbCharges
      .filter((c) => c.mandatory)
      .map((charge) => ({
        name: charge.name,
        type: charge.type,
        value: charge.value,
        mandatory: true,
      }));
  }

  // ── Todos los cobros adicionales (obligatorios BD + opcionales usuario) ──
  function getAllAdditionalCharges(): IndirectChargeInput[] {
    const dbObligatory = getDbChargesAsInputs();
    const dbOptional = dbCharges
      .filter((c) => !c.mandatory)
      .map((charge) => ({
        name: charge.name,
        type: charge.type,
        value: charge.value,
        mandatory: false,
      }));
    return [...dbObligatory, ...dbOptional, ...additionalCharges];
  }

  // ── Simular crédito ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedAmount = parseFloat(amount);
      const creditTypeName = selectedCreditType?.name || "General";

      // Validar montos si hay un tipo seleccionado
      if (selectedCreditType) {
        if (parsedAmount < selectedCreditType.minAmount) {
          setError(`El monto mínimo para ${creditTypeName} es $${selectedCreditType.minAmount.toLocaleString()}`);
          setLoading(false);
          return;
        }
        if (parsedAmount > selectedCreditType.maxAmount) {
          setError(`El monto máximo para ${creditTypeName} es $${selectedCreditType.maxAmount.toLocaleString()}`);
          setLoading(false);
          return;
        }
      }

      const allCharges = getAllAdditionalCharges();

      const params = {
        amount: parsedAmount,
        termMonths: parseInt(termMonths, 10),
        annualInterestRate: parseFloat(annualRate),
        creditTypeName,
        additionalCharges: allCharges,
      };

      const res = await fetch("/api/simulate/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          amortizationMethod: method,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al simular");
        setResult(null);
        setResultFrench(null);
        setResultGerman(null);
      } else {
        setResult(data);

        const frenchResult = simulate({
          ...params,
          amortizationMethod: "FRENCH",
        });

        const germanResult = simulate({
          ...params,
          amortizationMethod: "GERMAN",
        });

        setResultFrench(frenchResult);
        setResultGerman(germanResult);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setResult(null);
      setResultFrench(null);
      setResultGerman(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(mode: DownloadMode) {
    if (!resultFrench || !resultGerman) return;

    setDownloading(true);
    setShowDownloadMenu(false);

    try {
      await downloadCreditPDF(resultFrench, resultGerman, mode, companyInfo);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      setError("Error al generar el PDF. Intente de nuevo.");
    } finally {
      setDownloading(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ── Métodos de amortización disponibles para el tipo seleccionado ──
  const availableMethods: AmortizationMethod[] = selectedCreditType?.amortizationSystems?.length
    ? (selectedCreditType.amortizationSystems as AmortizationMethod[])
    : ["FRENCH", "GERMAN"];

  // ── Cobros totales para mostrar en el formulario ──
  const mandatoryDbCharges = dbCharges.filter((c) => c.mandatory);
  const optionalDbCharges = dbCharges.filter((c) => !c.mandatory);

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        <header className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
          <div className="relative px-6 py-10 text-center sm:px-8 lg:px-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">
              {companyInfo?.name || "SISCONTA"} · Ecuador
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                Simulador de Crédito
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
              Calcula tu tabla de amortización con los métodos Francés y Alemán.
              Incluye automáticamente el seguro obligatorio SOLCA.
            </p>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Estado de carga inicial */}
          {dataLoading && (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-300/20 border-t-indigo-400" />
              <p className="text-sm text-slate-400">Cargando tipos de crédito y configuración...</p>
            </div>
          )}

          {/* Error de carga */}
          {dataError && !dataLoading && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
              <p className="text-sm text-rose-300">{dataError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Sin tipos de crédito */}
          {!dataLoading && !dataError && creditTypes.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-4xl">🏦</p>
              <p className="mt-3 text-sm text-slate-400">
                No hay tipos de crédito configurados.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Un administrador debe crear tipos de crédito desde el panel de administración.
              </p>
            </div>
          )}

          {/* Formulario principal */}
          {!dataLoading && !dataError && creditTypes.length > 0 && (
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-lg xl:sticky xl:top-6 xl:self-start"
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
                    value={selectedCreditType?.id || ""}
                    onChange={(e) => handleCreditTypeChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {creditTypes.map((ct) => (
                      <option
                        key={ct.id}
                        value={ct.id}
                        className="bg-slate-900"
                      >
                        {ct.name} ({ct.annualInterestRate}%)
                      </option>
                    ))}
                  </select>
                  {selectedCreditType && (
                    <p className="mt-1 text-xs text-slate-500">
                      Monto: ${selectedCreditType.minAmount.toLocaleString()} — ${selectedCreditType.maxAmount.toLocaleString()}
                    </p>
                  )}
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
                    min={selectedCreditType?.minAmount || 1}
                    max={selectedCreditType?.maxAmount || undefined}
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
                  <p className="mt-1 text-xs text-slate-500">
                    Tasa por defecto del tipo de crédito seleccionado. Puede modificarla.
                  </p>
                </fieldset>

                {/* Método de amortización */}
                <fieldset>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Método de amortización
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["FRENCH", "GERMAN"] as const).map((m) => {
                      const isAvailable = availableMethods.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => isAvailable && setMethod(m)}
                          disabled={!isAvailable}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                            !isAvailable
                              ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                              : method === m
                              ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/10"
                              : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {m === "FRENCH" ? "Francés" : "Alemán"}
                          {!isAvailable && (
                            <span className="ml-1 text-[10px] text-slate-600">(N/D)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {method === "FRENCH"
                      ? "Cuota fija: pagas lo mismo cada mes."
                      : "Capital fijo: las cuotas van disminuyendo."}
                  </p>
                </fieldset>

                {/* ── Cobros indirectos ── */}
                <div className="border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowChargesForm(!showChargesForm)}
                    className="flex w-full items-center justify-between text-sm font-medium text-slate-300 transition hover:text-white"
                  >
                    <span>
                      Cobros indirectos ({mandatoryDbCharges.length + optionalDbCharges.length + additionalCharges.length})
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        showChargesForm ? "rotate-180" : ""
                      }`}
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
                      {/* Cobros obligatorios de la BD */}
                      {mandatoryDbCharges.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                            Obligatorios (tipo de crédito)
                          </p>
                          {mandatoryDbCharges.map((charge) => (
                            <div
                              key={charge.id}
                              className="flex items-center justify-between rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2 text-xs"
                            >
                              <span className="text-slate-300">
                                {charge.name} —{" "}
                                {charge.type === "FIXED"
                                  ? `$${charge.value}/mes`
                                  : `${charge.value}% anual`}
                              </span>
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-400">
                                OBLIGATORIO
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cobros opcionales de la BD */}
                      {optionalDbCharges.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/80">
                            Opcionales (tipo de crédito)
                          </p>
                          {optionalDbCharges.map((charge) => (
                            <div
                              key={charge.id}
                              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                            >
                              <span className="text-slate-300">
                                {charge.name} —{" "}
                                {charge.type === "FIXED"
                                  ? `$${charge.value}/mes`
                                  : `${charge.value}% anual`}
                              </span>
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-semibold text-blue-400">
                                INCLUIDO
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cobros adicionales del usuario */}
                      {additionalCharges.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Personalizados
                          </p>
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
                        </div>
                      )}

                      {/* Formulario para añadir cobros personalizados */}
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
                          + Añadir cobro personalizado
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
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

                <p className="text-center text-[10px] text-slate-500">
                  * El seguro SOLCA (0.5% anual) se incluye automáticamente en todos
                  los créditos como cobro obligatorio.
                </p>
              </form>

              {/* ── Resultados ── */}
              <section className="min-w-0 space-y-8">
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-lg font-semibold text-white">
                        Resultados de la Simulación
                      </h2>

                      <div className="relative self-start sm:self-auto" ref={downloadMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                          disabled={downloading}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white disabled:opacity-50"
                        >
                          {downloading ? (
                            <>
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
                              Generando…
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Descargar PDF
                              <svg
                                className={`h-3 w-3 transition-transform ${
                                  showDownloadMenu ? "rotate-180" : ""
                                }`}
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
                            </>
                          )}
                        </button>

                        {showDownloadMenu && (
                          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
                            <div className="p-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownload("FRENCH")}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </span>
                                <div>
                                  <p className="font-medium">Solo Francés</p>
                                  <p className="text-xs text-slate-500">Cuota fija — 1 tabla</p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload("GERMAN")}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </span>
                                <div>
                                  <p className="font-medium">Solo Alemán</p>
                                  <p className="text-xs text-slate-500">Capital constante — 1 tabla</p>
                                </div>
                              </button>

                              <div className="my-1 border-t border-white/5" />

                              <button
                                type="button"
                                onClick={() => handleDownload("BOTH")}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                  </svg>
                                </span>
                                <div>
                                  <p className="font-medium">Ambos métodos</p>
                                  <p className="text-xs text-slate-500">Comparación completa — 2 tablas</p>
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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
                        sublabel="Capital + Intereses + Cobros"
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

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Cobros Indirectos Aplicados
                      </h3>
                      <div className="space-y-2">
                        {result.charges.map((charge, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                            <div className="text-left sm:text-right">
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

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg">
                      <div className="border-b border-white/10 px-6 py-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                          Tabla de Amortización
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-sm">
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
          )}
        </main>
      </div>
    </div>
  );
}

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