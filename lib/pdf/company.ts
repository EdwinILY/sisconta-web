// ============================================================
// Datos estáticos de la empresa
// ============================================================
//
// IMPORTANTE PARA DESARROLLADORES:
// Estos datos son estáticos por ahora. Para migrar a datos
// dinámicos, reemplazar esta constante por una consulta a la
// tabla `Institution` de Supabase.
//
// Ejemplo de migración futura:
//
//   import { supabase } from "@/lib/supabase";
//
//   export async function getCompanyInfo() {
//     const { data } = await supabase
//       .from("Institution")
//       .select("*")
//       .single();
//     return {
//       name: data.name,
//       legalName: data.name,
//       ruc: data.ruc,
//       ...
//     };
//   }
//
// ============================================================

export interface CompanyInfo {
  /** Nombre comercial */
  name: string;
  /** Razón social */
  legalName: string;
  /** RUC de la empresa */
  ruc: string;
  /** Dirección principal */
  address: string;
  /** Teléfono de contacto */
  phone: string;
  /** Email corporativo */
  email: string;
  /** Sitio web */
  website: string;
  /** Slogan o descripción corta */
  tagline: string;
  // FUTURO: agregar logoUrl cuando se integre con la BD
  // logoUrl?: string;
}

/**
 * Información de la empresa para encabezados de PDF y reportes.
 *
 * ⚠️ EDITABLE: Modifique estos valores según la institución.
 * En el futuro, este objeto se reemplazará por datos de la BD.
 */
export const COMPANY_INFO: CompanyInfo = {
  name: "SisConta",
  legalName: "SisConta S.A.",
  ruc: "1791234567001",
  address: "Av. República E7-123, Quito, Ecuador",
  phone: "(02) 256-7890",
  email: "info@sisconta.ec",
  website: "www.sisconta.ec",
  tagline: "Sistema Contable Financiero",
};
