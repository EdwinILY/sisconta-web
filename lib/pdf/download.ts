// ============================================================
// Utilidad de descarga de PDF
// ============================================================
//
// Genera el PDF en el cliente usando @react-pdf/renderer y
// dispara la descarga del archivo.
//
// ARQUITECTURA:
// Esta función se importa desde el componente de la página
// (client component) y genera el PDF completamente en el
// navegador. No se necesita un endpoint del servidor.
//
// EXTENSIBILIDAD:
// Para agregar nuevos tipos de reportes (inversiones, etc.),
// crear un nuevo componente PDF y una nueva función de
// descarga siguiendo este mismo patrón.
//
// ============================================================

import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { CreditReportPDF } from "./CreditReportPDF";
import type { SimulationResult } from "@/lib/credit/types";
import type { CompanyInfo } from "./company";

/** Tipo de descarga */
export type DownloadMode = "FRENCH" | "GERMAN" | "BOTH";

/**
 * Genera y descarga el PDF de simulación de crédito.
 *
 * @param resultFrench - Resultado con método Francés
 * @param resultGerman - Resultado con método Alemán
 * @param mode - Qué incluir en el PDF: FRENCH, GERMAN o BOTH
 * @param companyInfo - Datos de la empresa (dinámicos desde admin)
 *
 * @example
 * // Descargar solo Francés con datos de empresa
 * await downloadCreditPDF(frenchResult, germanResult, "FRENCH", companyInfo);
 *
 * // Descargar ambos métodos (usa fallback si no se pasa companyInfo)
 * await downloadCreditPDF(frenchResult, germanResult, "BOTH");
 */
export async function downloadCreditPDF(
  resultFrench: SimulationResult,
  resultGerman: SimulationResult,
  mode: DownloadMode,
  companyInfo?: CompanyInfo
): Promise<void> {
  // Seleccionar qué resultados incluir
  let results: SimulationResult[];
  let filenameSuffix: string;

  switch (mode) {
    case "FRENCH":
      results = [resultFrench];
      filenameSuffix = "frances";
      break;
    case "GERMAN":
      results = [resultGerman];
      filenameSuffix = "aleman";
      break;
    case "BOTH":
      results = [resultFrench, resultGerman];
      filenameSuffix = "comparacion";
      break;
  }

  // Nombre descriptivo del archivo
  const amount = Math.round(resultFrench.amount);
  const term = resultFrench.termMonths;
  const filename = `simulacion_${filenameSuffix}_${amount}_${term}m.pdf`;

  // Generar el PDF como blob
  // Usamos createElement para evitar problemas con JSX en archivos .ts
  const doc = createElement(CreditReportPDF, {
    results,
    companyInfo,
    generatedAt: new Date(),
  }) as unknown as ReactElement<DocumentProps>;

  const blob = await pdf(doc).toBlob();

  // Disparar la descarga
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Limpiar
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
