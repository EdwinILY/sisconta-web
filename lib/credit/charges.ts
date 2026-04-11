// ============================================================
// Sistema de cobros indirectos — Extensible
// ============================================================
//
// ARQUITECTURA:
// Cada cobro indirecto es un objeto IndirectChargeInput.
// Para agregar un nuevo cobro (seguro, donación, comisión), solo
// se necesita crear el objeto y añadirlo a getDefaultCharges()
// si es obligatorio, o enviarlo en additionalCharges desde el
// cliente si es opcional.
//
// ============================================================

import type { IndirectChargeInput, CalculatedCharge } from "./types";

// ------------------------------------------------------------
// Cobros obligatorios predefinidos (contexto ecuatoriano)
// ------------------------------------------------------------

/**
 * Seguro obligatorio SOLCA — Sociedad de Lucha Contra el Cáncer.
 *
 * En Ecuador, todo crédito formal incluye una contribución al SOLCA.
 * Se cobra el 0.5% anual sobre el monto del crédito, prorrateado
 * mensualmente.
 *
 * Base legal: Ley de Creación del Impuesto del 0.5% a favor de SOLCA.
 */
export const SOLCA_CHARGE: IndirectChargeInput = {
  name: "Seguro SOLCA (0.5% anual)",
  type: "PERCENTAGE",
  value: 0.5, // 0.5% anual
  mandatory: true,
};

// ------------------------------------------------------------
// Para agregar nuevos cobros obligatorios, siga este patrón:
// ------------------------------------------------------------
//
// export const DESGRAVAMEN_CHARGE: IndirectChargeInput = {
//   name: "Seguro de Desgravamen",
//   type: "PERCENTAGE",
//   value: 0.065,
//   mandatory: true,
// };
//
// ... y añádalo a getDefaultCharges() abajo.
// ------------------------------------------------------------

/**
 * Retorna la lista de cobros indirectos obligatorios por defecto.
 *
 * Para extender el sistema, añada nuevos cobros aquí.
 */
export function getDefaultCharges(): IndirectChargeInput[] {
  return [SOLCA_CHARGE];
}

/**
 * Calcula el monto mensual de cada cobro indirecto.
 *
 * @param loanAmount - Monto total del crédito en USD
 * @param charges - Lista de cobros a calcular
 * @returns Lista de cobros con su monto mensual calculado
 */
export function calculateCharges(
  loanAmount: number,
  charges: IndirectChargeInput[]
): CalculatedCharge[] {
  return charges.map((charge) => {
    let monthlyAmount: number;

    switch (charge.type) {
      case "FIXED":
        // El valor ya es el monto mensual fijo en USD
        monthlyAmount = charge.value;
        break;

      case "PERCENTAGE":
        // El valor es un porcentaje anual sobre el monto del crédito
        // Se prorratea a mensual: (monto * porcentaje / 100) / 12
        monthlyAmount = (loanAmount * charge.value) / 100 / 12;
        break;

      default:
        monthlyAmount = 0;
    }

    return {
      name: charge.name,
      type: charge.type,
      value: charge.value,
      mandatory: charge.mandatory,
      monthlyAmount: Math.round(monthlyAmount * 100) / 100,
    };
  });
}

/**
 * Suma total de cobros mensuales.
 */
export function totalMonthlyCharges(charges: CalculatedCharge[]): number {
  const total = charges.reduce((sum, c) => sum + c.monthlyAmount, 0);
  return Math.round(total * 100) / 100;
}
