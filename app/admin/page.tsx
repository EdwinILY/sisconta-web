"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCurrentUser,
  isAuthenticated,
} from "@/lib/api/auth";
import {
  getInstitution,
  updateInstitution,
  uploadLogo,
  Institution,
} from "@/lib/api/institution";
import {
  getCreditTypes,
  createCreditType,
  updateCreditType,
  deleteCreditType,
  CreditType,
} from "@/lib/api/credit-types";
import {
  getChargesByCreditType,
  createCharge,
  updateCharge,
  deleteCharge,
  Charge,
} from "@/lib/api/charges";
import { ApiErrorInfo } from "@/lib/api/client";

type Section = "institution" | "creditTypes" | "charges";

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSection = (searchParams.get("section") as Section) || "institution";

  const [section, setSection] = useState<Section>(initialSection);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [loading, setLoading] = useState(true);

  const [alertError, setAlertError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [institutionRuc, setInstitutionRuc] = useState("");
  const [institutionContact, setInstitutionContact] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [creditTypes, setCreditTypes] = useState<CreditType[]>([]);
  const [creditTypesLoading, setCreditTypesLoading] = useState(false);
  const [creditTypeForm, setCreditTypeForm] = useState({
    name: "",
    minAmount: "",
    maxAmount: "",
    annualInterestRate: "",
    amortizationSystems: [] as string[],
  });
  const [creditTypeErrors, setCreditTypeErrors] = useState<Record<string, string>>(
    {}
  );
  const [creditTypeSubmitting, setCreditTypeSubmitting] = useState(false);
  const [editingCreditTypeId, setEditingCreditTypeId] = useState<string | null>(
    null
  );
  const [showCreditTypeModal, setShowCreditTypeModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState("");
  const [chargeForm, setChargeForm] = useState({
    name: "",
    type: "FIXED" as "FIXED" | "PERCENTAGE",
    value: "",
    mandatory: false,
  });
  const [chargeErrors, setChargeErrors] = useState<Record<string, string>>({});
  const [chargeSubmitting, setChargeSubmitting] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [deleteChargeConfirmId, setDeleteChargeConfirmId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const qpSection = (searchParams.get("section") as Section) || "institution";
    setSection(qpSection);
  }, [searchParams]);

  useEffect(() => {
    if (alertError) {
      const timer = setTimeout(() => setAlertError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertError]);

  useEffect(() => {
    if (alertSuccess) {
      const timer = setTimeout(() => setAlertSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertSuccess]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const currentUser = getCurrentUser();

    if (currentUser?.role !== "ADMIN") {
      router.push("/simulate/credit");
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (section === "institution" && !institutionLoading && !institution) {
      void loadInstitution();
    }
  }, [section]);

  useEffect(() => {
    if (section === "creditTypes" && creditTypes.length === 0) {
      void loadCreditTypes();
    }
  }, [section]);

  useEffect(() => {
    if (section === "charges" && creditTypes.length === 0) {
      void loadCreditTypes();
    }
  }, [section]);

  useEffect(() => {
    if (section === "charges" && selectedCreditTypeId) {
      void loadCharges();
    }
  }, [section, selectedCreditTypeId]);

  function changeSection(next: Section) {
    setSection(next);
    router.replace(`/admin?section=${next}`);
  }

  const loadInstitution = async () => {
    setInstitutionLoading(true);
    try {
      const data = await getInstitution();
      setInstitution(data);
      setInstitutionName(data.name || "");
      setInstitutionRuc(data.ruc || "");
      setInstitutionContact(data.contact || "");
      if ((data as any).logo) setLogoPreview((data as any).logo);
      if ((data as any).logoUrl) setLogoPreview((data as any).logoUrl);
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setInstitutionLoading(false);
    }
  };

  const handleInstitutionSave = async () => {
    if (!institution) return;

    setInstitutionLoading(true);
    try {
      await updateInstitution(institution.id, {
        name: institutionName,
        ruc: institutionRuc,
        contact: institutionContact,
      });

      if (logoFile) {
        await uploadLogo(institution.id, logoFile);
      }

      setAlertSuccess("Institución actualizada correctamente");
      await loadInstitution();
      setLogoFile(null);
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setInstitutionLoading(false);
    }
  };

  const loadCreditTypes = async () => {
    setCreditTypesLoading(true);
    try {
      const data = await getCreditTypes();
      setCreditTypes(data);

      if (!selectedCreditTypeId && data.length > 0) {
        setSelectedCreditTypeId(data[0].id);
      }
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setCreditTypesLoading(false);
    }
  };

  const validateCreditTypeForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!creditTypeForm.name.trim()) {
      errors.name = "El nombre es requerido";
    }

    if (!creditTypeForm.minAmount) {
      errors.minAmount = "El monto mínimo es requerido";
    }

    if (!creditTypeForm.maxAmount) {
      errors.maxAmount = "El monto máximo es requerido";
    }

    if (!creditTypeForm.annualInterestRate) {
      errors.annualInterestRate = "La tasa de interés es requerida";
    }

    const minAmount = parseFloat(creditTypeForm.minAmount);
    const maxAmount = parseFloat(creditTypeForm.maxAmount);
    const rate = parseFloat(creditTypeForm.annualInterestRate);

    if (!Number.isNaN(minAmount) && !Number.isNaN(maxAmount) && minAmount >= maxAmount) {
      errors.maxAmount = "El monto máximo debe ser mayor al mínimo";
    }

    if (!Number.isNaN(rate) && (rate < 0 || rate > 100)) {
      errors.annualInterestRate = "La tasa debe estar entre 0 y 100";
    }

    setCreditTypeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreditTypeSubmit = async () => {
    if (!validateCreditTypeForm()) return;
    if (!institution) return;

    setCreditTypeSubmitting(true);

    try {
      const data = {
        name: creditTypeForm.name,
        minAmount: parseFloat(creditTypeForm.minAmount),
        maxAmount: parseFloat(creditTypeForm.maxAmount),
        annualInterestRate: parseFloat(creditTypeForm.annualInterestRate),
        amortizationSystems: creditTypeForm.amortizationSystems,
        institutionId: institution.id,
      };

      if (editingCreditTypeId) {
        await updateCreditType(editingCreditTypeId, data);
        setAlertSuccess("Tipo de crédito actualizado correctamente");
      } else {
        await createCreditType(data);
        setAlertSuccess("Tipo de crédito creado correctamente");
      }

      setCreditTypeForm({
        name: "",
        minAmount: "",
        maxAmount: "",
        annualInterestRate: "",
        amortizationSystems: [],
      });
      setEditingCreditTypeId(null);
      setShowCreditTypeModal(false);
      await loadCreditTypes();
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setCreditTypeSubmitting(false);
    }
  };

  const handleDeleteCreditType = async (id: string) => {
    setCreditTypesLoading(true);
    try {
      await deleteCreditType(id);
      setAlertSuccess("Tipo de crédito eliminado correctamente");
      setDeleteConfirmId(null);
      await loadCreditTypes();
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setCreditTypesLoading(false);
    }
  };

  const openCreditTypeForm = (creditType?: CreditType) => {
    if (creditType) {
      setCreditTypeForm({
        name: creditType.name,
        minAmount: creditType.minAmount.toString(),
        maxAmount: creditType.maxAmount.toString(),
        annualInterestRate: creditType.annualInterestRate.toString(),
        amortizationSystems: creditType.amortizationSystems,
      });
      setEditingCreditTypeId(creditType.id);
    } else {
      setCreditTypeForm({
        name: "",
        minAmount: "",
        maxAmount: "",
        annualInterestRate: "",
        amortizationSystems: [],
      });
      setEditingCreditTypeId(null);
    }

    setCreditTypeErrors({});
    setShowCreditTypeModal(true);
  };

  const loadCharges = async () => {
    if (!selectedCreditTypeId) return;

    setChargesLoading(true);
    try {
      const data = await getChargesByCreditType(selectedCreditTypeId);
      setCharges(data);
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setChargesLoading(false);
    }
  };

  const validateChargeForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!chargeForm.name.trim()) {
      errors.name = "El nombre es requerido";
    }

    if (!chargeForm.value) {
      errors.value = "El valor es requerido";
    }

    const value = parseFloat(chargeForm.value);
    if (!Number.isNaN(value) && value <= 0) {
      errors.value = "El valor debe ser mayor a 0";
    }

    setChargeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChargeSubmit = async () => {
    if (!validateChargeForm() || !selectedCreditTypeId) return;

    setChargeSubmitting(true);

    try {
      const data = {
        name: chargeForm.name,
        type: chargeForm.type,
        value: parseFloat(chargeForm.value),
        mandatory: chargeForm.mandatory,
        creditTypeId: selectedCreditTypeId,
      };

      if (editingChargeId) {
        await updateCharge(editingChargeId, data);
        setAlertSuccess("Cargo actualizado correctamente");
      } else {
        await createCharge(data);
        setAlertSuccess("Cargo creado correctamente");
      }

      setChargeForm({
        name: "",
        type: "FIXED",
        value: "",
        mandatory: false,
      });
      setEditingChargeId(null);
      setShowChargeModal(false);
      await loadCharges();
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setChargeSubmitting(false);
    }
  };

  const handleDeleteCharge = async (id: string) => {
    setChargesLoading(true);
    try {
      await deleteCharge(id);
      setAlertSuccess("Cargo eliminado correctamente");
      setDeleteChargeConfirmId(null);
      await loadCharges();
    } catch (err) {
      const error = err as ApiErrorInfo;
      setAlertError(error.message);
    } finally {
      setChargesLoading(false);
    }
  };

  const openChargeForm = (charge?: Charge) => {
    if (charge) {
      setChargeForm({
        name: charge.name,
        type: charge.type,
        value: charge.value.toString(),
        mandatory: charge.mandatory,
      });
      setEditingChargeId(charge.id);
    } else {
      setChargeForm({
        name: "",
        type: "FIXED",
        value: "",
        mandatory: false,
      });
      setEditingChargeId(null);
    }

    setChargeErrors({});
    setShowChargeModal(true);
  };

  const sectionTitle =
    section === "institution"
      ? "Gestión de Institución"
      : section === "creditTypes"
      ? "Tipos de Crédito"
      : "Cargos Indirectos";

  const sectionDescription =
    section === "institution"
      ? "Actualiza la identidad visual y los datos generales de la institución."
      : section === "creditTypes"
      ? "Define montos, tasas y sistemas de amortización permitidos."
      : "Administra cargos indirectos asociados a cada tipo de crédito.";

  if (loading) {
    return (
      <div className="w-full">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 text-center text-slate-300 shadow-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300/20 border-t-indigo-400" />
          Cargando panel administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        <header className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
          <div className="relative px-6 py-10 text-center sm:px-8 lg:px-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
              SISCONTA · ADMINISTRACIÓN
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              <span className="bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                Configuración del sistema
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
              Administra institución, tipos de crédito y cargos indirectos desde
              una única vista centralizada.
            </p>
          </div>
        </header>

        {(alertError || alertSuccess) && (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            {alertError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {alertError}
              </div>
            ) : null}

            {alertSuccess ? (
              <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {alertSuccess}
              </div>
            ) : null}
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Configuración general
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {sectionTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {sectionDescription}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <TabButton
                  active={section === "institution"}
                  onClick={() => changeSection("institution")}
                  label="Institución"
                />
                <TabButton
                  active={section === "creditTypes"}
                  onClick={() => changeSection("creditTypes")}
                  label="Tipos de Crédito"
                />
                <TabButton
                  active={section === "charges"}
                  onClick={() => changeSection("charges")}
                  label="Cargos Indirectos"
                />
              </div>
            </div>

            {section === "institution" && (
              <InstitutionSection
                institution={institution}
                loading={institutionLoading}
                institutionName={institutionName}
                setInstitutionName={setInstitutionName}
                institutionRuc={institutionRuc}
                setInstitutionRuc={setInstitutionRuc}
                institutionContact={institutionContact}
                setInstitutionContact={setInstitutionContact}
                logoPreview={logoPreview}
                setLogoPreview={setLogoPreview}
                setLogoFile={setLogoFile}
                onSave={handleInstitutionSave}
              />
            )}

            {section === "creditTypes" && (
              <CreditTypesSection
                creditTypes={creditTypes}
                loading={creditTypesLoading}
                showForm={showCreditTypeModal}
                onShowForm={() => openCreditTypeForm()}
                onHideForm={() => setShowCreditTypeModal(false)}
                form={creditTypeForm}
                setForm={setCreditTypeForm}
                errors={creditTypeErrors}
                submitting={creditTypeSubmitting}
                onSubmit={handleCreditTypeSubmit}
                onEdit={(ct: CreditType) => openCreditTypeForm(ct)}
                onDelete={(id: string) => setDeleteConfirmId(id)}
                deleteConfirmId={deleteConfirmId}
                onConfirmDelete={handleDeleteCreditType}
                onCancelDelete={() => setDeleteConfirmId(null)}
              />
            )}

            {section === "charges" && (
              <ChargesSection
                creditTypes={creditTypes}
                selectedCreditTypeId={selectedCreditTypeId}
                setSelectedCreditTypeId={setSelectedCreditTypeId}
                charges={charges}
                loading={chargesLoading}
                showForm={showChargeModal}
                onShowForm={() => openChargeForm()}
                onHideForm={() => setShowChargeModal(false)}
                form={chargeForm}
                setForm={setChargeForm}
                errors={chargeErrors}
                submitting={chargeSubmitting}
                onSubmit={handleChargeSubmit}
                onEdit={(c: Charge) => openChargeForm(c)}
                onDelete={(id: string) => setDeleteChargeConfirmId(id)}
                deleteConfirmId={deleteChargeConfirmId}
                onConfirmDelete={handleDeleteCharge}
                onCancelDelete={() => setDeleteChargeConfirmId(null)}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function InstitutionSection({
  institution,
  loading,
  institutionName,
  setInstitutionName,
  institutionRuc,
  setInstitutionRuc,
  institutionContact,
  setInstitutionContact,
  logoPreview,
  setLogoPreview,
  setLogoFile,
  onSave,
}: any) {
  if (!institution) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400 backdrop-blur-lg">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-300/20 border-t-blue-400" />
        Cargando institución...
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
        <h3 className="text-lg font-semibold text-white">Datos generales</h3>

        <div className="mt-5 space-y-4">
          <Field label="Nombre">
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </Field>

          <Field label="RUC">
            <input
              type="text"
              value={institutionRuc}
              onChange={(e) => setInstitutionRuc(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </Field>

          <Field label="Contacto">
            <textarea
              value={institutionContact}
              onChange={(e) => setInstitutionContact(e.target.value)}
              disabled={loading}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </Field>

          <button
            onClick={onSave}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
        <h3 className="text-lg font-semibold text-white">Logo institucional</h3>

        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6">
          {logoPreview ? (
            <div className="text-center">
              <img
                src={logoPreview}
                alt="Logo"
                className="mx-auto mb-4 max-h-48 max-w-full rounded-xl bg-white p-3"
              />
              <p className="text-sm text-slate-400">Vista previa actual</p>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-slate-500">
              <p className="text-4xl">🖼️</p>
              <p className="mt-3 text-sm">No hay logo cargado</p>
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLogoFile(file);
              const reader = new FileReader();
              reader.onload = (event) => {
                setLogoPreview(event.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
          disabled={loading}
          className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500/15 file:px-4 file:py-2 file:font-semibold file:text-blue-300 hover:file:bg-blue-500/25"
        />
      </article>
    </div>
  );
}

function CreditTypesSection({
  creditTypes,
  loading,
  showForm,
  onShowForm,
  onHideForm,
  form,
  setForm,
  errors,
  submitting,
  onSubmit,
  onEdit,
  onDelete,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: any) {
  return (
    <div className="space-y-4">
      <button
        onClick={onShowForm}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500"
      >
        + Nuevo Tipo de Crédito
      </button>

      {showForm && (
        <Modal
          title={form.name ? "Editar Tipo de Crédito" : "Crear Tipo de Crédito"}
          onClose={onHideForm}
        >
          <div className="space-y-4">
            <Field label="Nombre" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass(!!errors.name)}
                disabled={submitting}
              />
            </Field>

            <Field label="Monto mínimo" error={errors.minAmount}>
              <input
                type="number"
                value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                className={inputClass(!!errors.minAmount)}
                disabled={submitting}
              />
            </Field>

            <Field label="Monto máximo" error={errors.maxAmount}>
              <input
                type="number"
                value={form.maxAmount}
                onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                className={inputClass(!!errors.maxAmount)}
                disabled={submitting}
              />
            </Field>

            <Field label="Tasa anual (%)" error={errors.annualInterestRate}>
              <input
                type="number"
                step="0.01"
                value={form.annualInterestRate}
                onChange={(e) =>
                  setForm({ ...form, annualInterestRate: e.target.value })
                }
                className={inputClass(!!errors.annualInterestRate)}
                disabled={submitting}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                Sistemas de amortización
              </p>
              <div className="space-y-2">
                {["FRENCH", "GERMAN"].map((system) => (
                  <label
                    key={system}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={form.amortizationSystems.includes(system)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            amortizationSystems: [
                              ...form.amortizationSystems,
                              system,
                            ],
                          });
                        } else {
                          setForm({
                            ...form,
                            amortizationSystems:
                              form.amortizationSystems.filter(
                                (s: string) => s !== system
                              ),
                          });
                        }
                      }}
                      disabled={submitting}
                    />
                    {system}
                  </label>
                ))}
              </div>
            </div>

            <ModalActions
              onCancel={onHideForm}
              onConfirm={onSubmit}
              confirmText={submitting ? "Guardando..." : "Guardar"}
            />
          </div>
        </Modal>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg">
        {loading ? (
          <LoaderBlock text="Cargando tipos de crédito..." />
        ) : creditTypes.length === 0 ? (
          <EmptyBlock text="No hay tipos de crédito registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Monto Min</th>
                  <th className="px-6 py-4">Monto Max</th>
                  <th className="px-6 py-4">Tasa</th>
                  <th className="px-6 py-4">Sistemas</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {creditTypes.map((ct: CreditType) => (
                  <tr key={ct.id} className="hover:bg-white/[0.03]">
                    <td className="px-6 py-4 text-white">{ct.name}</td>
                    <td className="px-6 py-4 text-slate-300">
                      ${ct.minAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      ${ct.maxAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {ct.annualInterestRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {ct.amortizationSystems.join(", ")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => onEdit(ct)}
                          className="text-blue-300 hover:text-blue-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(ct.id)}
                          className="text-rose-300 hover:text-rose-200"
                        >
                          Eliminar
                        </button>
                      </div>

                      {deleteConfirmId === ct.id && (
                        <ConfirmModal
                          text="¿Estás seguro de que deseas eliminar este tipo de crédito?"
                          onCancel={onCancelDelete}
                          onConfirm={() => onConfirmDelete(ct.id)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ChargesSection({
  creditTypes,
  selectedCreditTypeId,
  setSelectedCreditTypeId,
  charges,
  loading,
  showForm,
  onShowForm,
  onHideForm,
  form,
  setForm,
  errors,
  submitting,
  onSubmit,
  onEdit,
  onDelete,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg">
        <Field label="Seleccionar Tipo de Crédito">
          <select
            value={selectedCreditTypeId}
            onChange={(e) => setSelectedCreditTypeId(e.target.value)}
            className={inputClass(false)}
          >
            <option value="" className="bg-slate-900">
              -- Elige un tipo de crédito --
            </option>
            {creditTypes.map((ct: CreditType) => (
              <option key={ct.id} value={ct.id} className="bg-slate-900">
                {ct.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {selectedCreditTypeId && (
        <>
          <button
            onClick={onShowForm}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500"
          >
            + Nuevo Cargo
          </button>

          {showForm && (
            <Modal title={form.name ? "Editar Cargo" : "Crear Cargo"} onClose={onHideForm}>
              <div className="space-y-4">
                <Field label="Nombre" error={errors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass(!!errors.name)}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Tipo">
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as "FIXED" | "PERCENTAGE",
                      })
                    }
                    className={inputClass(false)}
                    disabled={submitting}
                  >
                    <option value="FIXED" className="bg-slate-900">
                      Fijo
                    </option>
                    <option value="PERCENTAGE" className="bg-slate-900">
                      Porcentaje
                    </option>
                  </select>
                </Field>

                <Field label="Valor" error={errors.value}>
                  <input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className={inputClass(!!errors.value)}
                    disabled={submitting}
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.mandatory}
                    onChange={(e) =>
                      setForm({ ...form, mandatory: e.target.checked })
                    }
                    disabled={submitting}
                  />
                  Obligatorio
                </label>

                <ModalActions
                  onCancel={onHideForm}
                  onConfirm={onSubmit}
                  confirmText={submitting ? "Guardando..." : "Guardar"}
                />
              </div>
            </Modal>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg">
            {loading ? (
              <LoaderBlock text="Cargando cargos..." />
            ) : charges.length === 0 ? (
              <EmptyBlock text="No hay cargos registrados para este tipo de crédito." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Obligatorio</th>
                      <th className="px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {charges.map((charge: Charge) => (
                      <tr key={charge.id} className="hover:bg-white/[0.03]">
                        <td className="px-6 py-4 text-white">{charge.name}</td>
                        <td className="px-6 py-4 text-slate-300">
                          {charge.type === "FIXED" ? "Fijo" : "Porcentaje"}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {charge.type === "FIXED"
                            ? `$${charge.value.toFixed(2)}`
                            : `${charge.value.toFixed(2)}%`}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {charge.mandatory ? "Sí" : "No"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button
                              onClick={() => onEdit(charge)}
                              className="text-blue-300 hover:text-blue-200"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDelete(charge.id)}
                              className="text-rose-300 hover:text-rose-200"
                            >
                              Eliminar
                            </button>
                          </div>

                          {deleteConfirmId === charge.id && (
                            <ConfirmModal
                              text="¿Estás seguro de que deseas eliminar este cargo?"
                              onCancel={onCancelDelete}
                              onConfirm={() => onConfirmDelete(charge.id)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition ${
    hasError
      ? "border-rose-500/40 bg-rose-500/10 focus:ring-2 focus:ring-rose-500/20"
      : "border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
  }`;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmText,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onCancel}
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-indigo-500"
      >
        {confirmText}
      </button>
    </div>
  );
}

function ConfirmModal({
  text,
  onCancel,
  onConfirm,
}: {
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <p className="mb-6 text-sm text-slate-200">{text}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-rose-500 hover:to-red-500"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function LoaderBlock({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-slate-400">
      <div className="mr-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-300/20 border-t-blue-400" />
      {text}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="p-8 text-center text-slate-400">{text}</div>;
}