// ============================================================
// Componente PDF — Reporte de Simulación de Crédito
// ============================================================
//
// Usa @react-pdf/renderer para generar PDFs en el cliente.
//
// ESTRUCTURA DEL PDF:
//   1. Encabezado con datos de empresa (dinámicos desde admin)
//   2. Parámetros del crédito ingresados
//   3. Cobros indirectos aplicados (SOLCA + obligatorios + adicionales)
//   4. Resumen financiero (tarjetas)
//   5. Tabla de amortización completa
//   6. Pie de página con número de página y disclaimer
//
// Cuando se selecciona "Ambos métodos", se genera una sección
// de tabla por cada método con un salto de página entre ellos.
//
// ============================================================

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { SimulationResult } from "@/lib/credit/types";
import type { CompanyInfo } from "./company";
import { COMPANY_INFO } from "./company";

// ============================================================
// Paleta de colores profesional
// ============================================================
const COLORS = {
  primary: "#1a365d",       // Azul corporativo oscuro
  primaryLight: "#2b6cb0",  // Azul corporativo claro
  accent: "#4c51bf",        // Indigo para acentos
  dark: "#1a202c",          // Texto principal
  medium: "#4a5568",        // Texto secundario
  light: "#a0aec0",         // Texto terciario
  border: "#e2e8f0",        // Bordes
  bgLight: "#f7fafc",       // Fondo claro
  bgAccent: "#ebf4ff",      // Fondo azul claro
  white: "#ffffff",
  success: "#276749",       // Verde para resumen
  warning: "#c05621",       // Naranja para cobros
};

// ============================================================
// Estilos del PDF
// ============================================================
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.dark,
  },

  // ── Encabezado ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: `2px solid ${COLORS.primary}`,
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 50,
    height: 50,
    objectFit: "contain" as const,
  },
  headerTextBlock: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  companyTagline: {
    fontSize: 8,
    color: COLORS.medium,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerRightText: {
    fontSize: 7.5,
    color: COLORS.medium,
    marginBottom: 1.5,
  },

  // ── Título del reporte ──
  reportTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 8,
    color: COLORS.medium,
    textAlign: "center",
    marginBottom: 16,
  },

  // ── Secciones ──
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottom: `1px solid ${COLORS.border}`,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 16,
  },

  // ── Grid de parámetros ──
  paramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paramItem: {
    width: "33.33%",
    marginBottom: 8,
  },
  paramLabel: {
    fontSize: 7,
    color: COLORS.light,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  paramValue: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
  },

  // ── Resumen financiero ──
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgLight,
  },
  summaryCardAccent: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    backgroundColor: COLORS.bgAccent,
    border: `1px solid ${COLORS.primaryLight}`,
  },
  summaryLabel: {
    fontSize: 7,
    color: COLORS.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  summaryValueSmall: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
  },

  // ── Cobros indirectos ──
  chargeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  chargeRowAlt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: `0.5px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgLight,
  },
  chargeName: {
    fontSize: 8.5,
    color: COLORS.dark,
    flex: 1,
  },
  chargeBadge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.warning,
    backgroundColor: "#fefcbf",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 2,
    marginRight: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  chargeAmount: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    textAlign: "right",
    width: 70,
  },
  chargeDetail: {
    fontSize: 7,
    color: COLORS.light,
    textAlign: "right",
    width: 70,
  },

  // ── Tabla de amortización ──
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: `0.5px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgLight,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.dark,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
  },
  tableFooter: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: COLORS.bgAccent,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderTop: `1.5px solid ${COLORS.primary}`,
  },
  tableFooterCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },

  // Anchos de columnas de tabla
  colPeriod: { width: "8%" },
  colPayment: { width: "18%", textAlign: "right" as const },
  colPrincipal: { width: "18%", textAlign: "right" as const },
  colInterest: { width: "18%", textAlign: "right" as const },
  colCharges: { width: "18%", textAlign: "right" as const },
  colBalance: { width: "20%", textAlign: "right" as const },

  // ── Pie de página ──
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.light,
  },

  // ── Separador de método ──
  methodDivider: {
    marginTop: 10,
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: `1.5px solid ${COLORS.primaryLight}`,
  },
});

// ============================================================
// Formato de moneda
// ============================================================
function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function methodLabel(method: string): string {
  return method === "FRENCH"
    ? "Francés (Cuota Fija)"
    : "Alemán (Capital Constante)";
}

// ============================================================
// Props del componente
// ============================================================
export interface CreditReportPDFProps {
  /** Resultados a incluir en el PDF (1 o 2 si es "ambos") */
  results: SimulationResult[];
  /** Datos de la empresa (dinámicos desde admin) */
  companyInfo?: CompanyInfo;
  /** Fecha de generación (se usa para el reporte) */
  generatedAt?: Date;
}

// ============================================================
// Componente PDF
// ============================================================
export function CreditReportPDF({
  results,
  companyInfo = COMPANY_INFO,
  generatedAt = new Date(),
}: CreditReportPDFProps) {
  const isBoth = results.length > 1;
  // Usar el primer resultado para parámetros generales (son iguales en ambos)
  const baseResult = results[0];
  const dateStr = generatedAt.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = generatedAt.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Encabezado de empresa ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companyInfo.logoUrl && (
              <Image src={companyInfo.logoUrl} style={styles.headerLogo} />
            )}
            <View style={styles.headerTextBlock}>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
              <Text style={styles.companyTagline}>{companyInfo.tagline}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerRightText}>
              {companyInfo.legalName}
            </Text>
            <Text style={styles.headerRightText}>
              RUC: {companyInfo.ruc}
            </Text>
            <Text style={styles.headerRightText}>{companyInfo.contact}</Text>
          </View>
        </View>

        {/* ── Título ── */}
        <Text style={styles.reportTitle}>
          Simulación de Crédito —{" "}
          {isBoth ? "Comparación Francés vs Alemán" : methodLabel(baseResult.method)}
        </Text>
        <Text style={styles.reportSubtitle}>
          Generado el {dateStr} a las {timeStr}
        </Text>

        {/* ── Parámetros del crédito ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parámetros del Crédito</Text>
          <View style={styles.paramsGrid}>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Tipo de crédito</Text>
              <Text style={styles.paramValue}>{baseResult.creditType}</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Monto</Text>
              <Text style={styles.paramValue}>${fmt(baseResult.amount)}</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Plazo</Text>
              <Text style={styles.paramValue}>
                {baseResult.termMonths} meses
              </Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Tasa anual</Text>
              <Text style={styles.paramValue}>
                {baseResult.annualInterestRate}%
              </Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Tasa mensual</Text>
              <Text style={styles.paramValue}>{baseResult.monthlyRate}%</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>
                {isBoth ? "Métodos" : "Método"}
              </Text>
              <Text style={styles.paramValue}>
                {isBoth
                  ? "Francés y Alemán"
                  : methodLabel(baseResult.method)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Cobros indirectos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cobros Indirectos Aplicados</Text>
          {baseResult.charges.map((charge, i) => (
            <View
              key={i}
              style={i % 2 === 0 ? styles.chargeRow : styles.chargeRowAlt}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                {charge.mandatory && (
                  <Text style={styles.chargeBadge}>Obligatorio</Text>
                )}
                <Text style={styles.chargeName}>{charge.name}</Text>
              </View>
              <View>
                <Text style={styles.chargeAmount}>
                  ${fmt(charge.monthlyAmount)}/mes
                </Text>
                <Text style={styles.chargeDetail}>
                  {charge.type === "FIXED"
                    ? `$${charge.value} fijo`
                    : `${charge.value}% anual`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Resumen financiero (por cada resultado) ── */}
        {results.map((r, idx) => (
          <View key={idx} style={styles.section}>
            {isBoth && (
              <Text style={styles.methodTitle}>
                {methodLabel(r.method)}
              </Text>
            )}

            <View style={styles.summaryRow}>
              <View style={styles.summaryCardAccent}>
                <Text style={styles.summaryLabel}>Cuota mensual</Text>
                <Text style={styles.summaryValue}>
                  ${fmt(r.totalPayment / r.termMonths)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total a pagar</Text>
                <Text style={styles.summaryValueSmall}>
                  ${fmt(r.totalPayment)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total intereses</Text>
                <Text style={styles.summaryValueSmall}>
                  ${fmt(r.totalInterest)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total cobros</Text>
                <Text style={styles.summaryValueSmall}>
                  ${fmt(r.totalCharges)}
                </Text>
              </View>
            </View>

            {/* ── Tabla de amortización ── */}
            <Text style={styles.sectionTitle}>
              Tabla de Amortización{isBoth ? ` — ${methodLabel(r.method)}` : ""}
            </Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colPeriod]}>
                  N°
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colPayment]}>
                  Cuota
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colPrincipal]}>
                  Capital
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colInterest]}>
                  Interés
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colCharges]}>
                  Cobros
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colBalance]}>
                  Saldo
                </Text>
              </View>

              {/* Body */}
              {r.schedule.map((row, rowIdx) => (
                <View
                  key={row.period}
                  style={
                    rowIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                  }
                >
                  <Text style={[styles.tableCellBold, styles.colPeriod]}>
                    {row.period}
                  </Text>
                  <Text style={[styles.tableCellBold, styles.colPayment]}>
                    ${fmt(row.payment)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrincipal]}>
                    ${fmt(row.principal)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colInterest]}>
                    ${fmt(row.interest)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCharges]}>
                    ${fmt(row.charges)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colBalance]}>
                    ${fmt(row.balance)}
                  </Text>
                </View>
              ))}

              {/* Footer (totales) */}
              <View style={styles.tableFooter}>
                <Text style={[styles.tableFooterCell, styles.colPeriod]}>
                  Total
                </Text>
                <Text style={[styles.tableFooterCell, styles.colPayment]}>
                  ${fmt(r.totalPayment)}
                </Text>
                <Text style={[styles.tableFooterCell, styles.colPrincipal]}>
                  ${fmt(r.amount)}
                </Text>
                <Text style={[styles.tableFooterCell, styles.colInterest]}>
                  ${fmt(r.totalInterest)}
                </Text>
                <Text style={[styles.tableFooterCell, styles.colCharges]}>
                  ${fmt(r.totalCharges)}
                </Text>
                <Text style={[styles.tableFooterCell, styles.colBalance]}>
                  —
                </Text>
              </View>
            </View>

            {/* Salto de página entre métodos si es "ambos" */}
            {isBoth && idx === 0 && (
              <View break style={styles.methodDivider} />
            )}
          </View>
        ))}

        {/* ── Pie de página ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companyInfo.name} — Documento generado automáticamente
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
