// ============================================================
// Datos de la empresa — Dinámicos desde el panel de admin
// ============================================================
//
// Los datos se obtienen del endpoint GET /institution del backend.
// Si la petición falla, se usa COMPANY_INFO como fallback.
//
// ============================================================

export interface CompanyInfo {
  /** Nombre comercial */
  name: string;
  /** Razón social */
  legalName: string;
  /** RUC de la empresa */
  ruc: string;
  /** Información de contacto */
  contact: string;
  /** Slogan o descripción corta */
  tagline: string;
  /** URL del logo institucional (opcional) */
  logoUrl?: string;
}

/**
 * Datos de empresa por defecto (fallback si falla la carga).
 */
export const COMPANY_INFO: CompanyInfo = {
  name: "SisConta",
  legalName: "SisConta S.A.",
  ruc: "1791234567001",
  contact: "Quito, Ecuador",
  tagline: "Sistema Contable Financiero",
};

/**
 * Construye un objeto CompanyInfo a partir de los datos de la
 * tabla Institution del backend.
 *
 * @param institution - Datos crudos de GET /institution
 * @returns CompanyInfo para usar en los PDFs
 */
export function buildCompanyInfo(institution: {
  name?: string;
  ruc?: string;
  contact?: string;
  logoUrl?: string;
} | null): CompanyInfo {
  if (!institution) return COMPANY_INFO;

  return {
    name: institution.name || COMPANY_INFO.name,
    legalName: institution.name || COMPANY_INFO.legalName,
    ruc: institution.ruc || COMPANY_INFO.ruc,
    contact: institution.contact || COMPANY_INFO.contact,
    tagline: "Sistema Contable Financiero",
    logoUrl: institution.logoUrl || undefined,
  };
}
