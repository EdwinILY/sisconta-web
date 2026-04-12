"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  isAuthenticated,
  logout,
  getToken,
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
  const [section, setSection] = useState<Section>("institution");
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [loading, setLoading] = useState(true);

  // Global state for alerts
  const [alertError, setAlertError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");

  // Institution State
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [institutionRuc, setInstitutionRuc] = useState("");
  const [institutionContact, setInstitutionContact] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Credit Types State
  const [creditTypes, setCreditTypes] = useState<CreditType[]>([]);
  const [creditTypesLoading, setCreditTypesLoading] = useState(false);
  const [creditTypeForm, setCreditTypeForm] = useState({
    name: "",
    minAmount: "",
    maxAmount: "",
    annualInterestRate: "",
    amortizationSystems: [] as string[],
  });
  const [creditTypeErrors, setCreditTypeErrors] = useState<
    Record<string, string>
  >({});
  const [creditTypeSubmitting, setCreditTypeSubmitting] = useState(false);
  const [editingCreditTypeId, setEditingCreditTypeId] = useState<string | null>(
    null
  );
  const [showCreditTypeModal, setShowCreditTypeModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Charges State
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
  const [deleteChargeConfirmId, setDeleteChargeConfirmId] = useState<
    string | null
  >(null);

  // Auto-hide alerts
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

  // Check auth on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const currentUser = getCurrentUser();
    if (currentUser?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }, [router]);

  // Load institution
  useEffect(() => {
    if (section === "institution" && !institutionLoading && !institution) {
      loadInstitution();
    }
  }, [section]);

  const loadInstitution = async () => {
    setInstitutionLoading(true);
    try {
      const data = await getInstitution();
      setInstitution(data);
      setInstitutionName(data.name || "");
      setInstitutionRuc(data.ruc || "");
      setInstitutionContact(data.contact || "");
      if (data.logo) {
        setLogoPreview(data.logo);
      }
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

  // Load credit types
  useEffect(() => {
    if (section === "creditTypes" && creditTypes.length === 0) {
      loadCreditTypes();
    }
  }, [section]);

  const loadCreditTypes = async () => {
    setCreditTypesLoading(true);
    try {
      const data = await getCreditTypes();
      setCreditTypes(data);
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

    if (minAmount >= maxAmount) {
      errors.maxAmount = "El monto máximo debe ser mayor al mínimo";
    }

    if (rate < 0 || rate > 100) {
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

  // Load charges
  useEffect(() => {
    if (section === "charges" && selectedCreditTypeId) {
      loadCharges();
    }
  }, [section, selectedCreditTypeId]);

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
    if (value <= 0) {
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo & Title */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-900">SISCONTA</h1>
          <p className="text-xs text-gray-600 mt-1">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setSection("institution")}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
              section === "institution"
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            🏢 Institución
          </button>
          <button
            onClick={() => setSection("creditTypes")}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
              section === "creditTypes"
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            💳 Tipos de Crédito
          </button>
          <button
            onClick={() => setSection("charges")}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
              section === "charges"
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            💰 Cargos Indirectos
          </button>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-700 px-3 py-2 rounded-lg font-medium hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {section === "institution" && "Gestión de Institución"}
            {section === "creditTypes" && "Tipos de Crédito"}
            {section === "charges" && "Cargos Indirectos"}
          </h2>
        </div>

        {/* Alerts */}
        {alertError && (
          <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{alertError}</p>
          </div>
        )}

        {alertSuccess && (
          <div className="mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">{alertSuccess}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
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
              onEdit={(ct) => openCreditTypeForm(ct)}
              onDelete={(id) => setDeleteConfirmId(id)}
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
              onEdit={(c) => openChargeForm(c)}
              onDelete={(id) => setDeleteChargeConfirmId(id)}
              deleteConfirmId={deleteChargeConfirmId}
              onConfirmDelete={handleDeleteCharge}
              onCancelDelete={() => setDeleteChargeConfirmId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Institution Section Component
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
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando institución...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Datos Generales
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RUC
            </label>
            <input
              type="text"
              value={institutionRuc}
              onChange={(e) => setInstitutionRuc(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contacto
            </label>
            <textarea
              value={institutionContact}
              onChange={(e) => setInstitutionContact(e.target.value)}
              disabled={loading}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            />
          </div>

          <button
            onClick={onSave}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </button>
        </div>

        {/* Logo Upload */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo</h3>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-64 bg-gray-50">
            {logoPreview ? (
              <div className="text-center">
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="max-w-full max-h-48 mx-auto mb-4 rounded-lg"
                />
                <p className="text-sm text-gray-600 mb-2">Logo actual</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-2xl mb-2">📷</p>
                <p className="text-gray-600 text-sm">Sin logo</p>
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
            className="mt-4 w-full"
          />
        </div>
      </div>
    </div>
  );
}

// Credit Types Section Component
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
        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
      >
        + Nuevo Tipo de Crédito
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? "Editar" : "Crear"} Tipo de Crédito
            </h3>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={submitting}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Mínimo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.minAmount}
                  onChange={(e) =>
                    setForm({ ...form, minAmount: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minAmount
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={submitting}
                />
                {errors.minAmount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.minAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Máximo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.maxAmount}
                  onChange={(e) =>
                    setForm({ ...form, maxAmount: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxAmount
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={submitting}
                />
                {errors.maxAmount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.maxAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasa de Interés Anual (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.annualInterestRate}
                  onChange={(e) =>
                    setForm({ ...form, annualInterestRate: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.annualInterestRate
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={submitting}
                />
                {errors.annualInterestRate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.annualInterestRate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sistemas de Amortización
                </label>
                <div className="space-y-2">
                  {["FRENCH", "GERMAN"].map((system) => (
                    <label
                      key={system}
                      className="flex items-center gap-2 cursor-pointer"
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
                      <span className="text-sm text-gray-700">{system}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={onHideForm}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : creditTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No hay tipos de crédito registrados
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Monto Min
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Monto Max
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Tasa %
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Sistemas
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {creditTypes.map((ct: CreditType) => (
                <tr
                  key={ct.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {ct.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    ${ct.minAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    ${ct.maxAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ct.annualInterestRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ct.amortizationSystems.join(", ")}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2 flex">
                    <button
                      onClick={() => onEdit(ct)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(ct.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Eliminar
                    </button>

                    {deleteConfirmId === ct.id && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm">
                          <p className="text-gray-900 mb-6">
                            ¿Estás seguro de que deseas eliminar este tipo de
                            crédito?
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={onCancelDelete}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => onConfirmDelete(ct.id)}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Charges Section Component
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
      {/* Credit Type Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Tipo de Crédito
        </label>
        <select
          value={selectedCreditTypeId}
          onChange={(e) => setSelectedCreditTypeId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">-- Elige un tipo de crédito --</option>
          {creditTypes.map((ct: CreditType) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCreditTypeId && (
        <>
          <button
            onClick={onShowForm}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Nuevo Cargo
          </button>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {form.id ? "Editar" : "Crear"} Cargo
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={submitting}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as "FIXED" | "PERCENTAGE",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="FIXED">Fijo</option>
                      <option value="PERCENTAGE">Porcentaje</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.value}
                      onChange={(e) =>
                        setForm({ ...form, value: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.value
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={submitting}
                    />
                    {errors.value && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.value}
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mandatory}
                      onChange={(e) =>
                        setForm({ ...form, mandatory: e.target.checked })
                      }
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-700">
                      Obligatorio
                    </span>
                  </label>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={onHideForm}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Guardando...
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : charges.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No hay cargos registrados para este tipo de crédito
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Obligatorio
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {charges.map((charge: Charge) => (
                    <tr key={charge.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {charge.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {charge.type === "FIXED" ? "Fijo" : "Porcentaje"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {charge.type === "FIXED"
                          ? `$${charge.value.toFixed(2)}`
                          : `${charge.value.toFixed(2)}%`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {charge.mandatory ? "Sí" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex">
                        <button
                          onClick={() => onEdit(charge)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(charge.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Eliminar
                        </button>

                        {deleteConfirmId === charge.id && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm">
                              <p className="text-gray-900 mb-6">
                                ¿Estás seguro de que deseas eliminar este
                                cargo?
                              </p>
                              <div className="flex gap-3">
                                <button
                                  onClick={onCancelDelete}
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => onConfirmDelete(charge.id)}
                                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
