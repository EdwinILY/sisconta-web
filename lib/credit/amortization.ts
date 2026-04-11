// ============================================================
// Motor de cálculo de amortización
// ============================================================
//
// Métodos soportados:
//   - FRENCH  (Francés): cuota fija, capital variable
//   - GERMAN  (Alemán):  capital fijo, cuota variable
//
// Todos los valores se redondean a 2 decimales.
// ============================================================

import type {
  SimulationRequest,
  SimulationResult,
  PaymentRow,
  IndirectChargeInput,
} from "./types";
import {
  getDefaultCharges,
  calculateCharges,
  totalMonthlyCharges,
} from "./charges";

/** Redondea un número a 2 decimales */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ------------------------------------------------------------
// Método Francés — Cuota fija
// ------------------------------------------------------------

/**
 * Calcula la tabla de amortización con el método Francés.
 *
 * Fórmula de la cuota (sin cobros):
 *   C = P × [ i(1+i)^n ] / [ (1+i)^n − 1 ]
 *
 * Donde:
 *   P = monto del crédito
 *   i = tasa de interés mensual (decimal)
 *   n = número de cuotas (meses)
 */
function simulateFrench(
  amount: number,
  termMonths: number,
  monthlyRate: number,
  monthlyChargesTotal: number
): PaymentRow[] {
  const schedule: PaymentRow[] = [];
  let balance = amount;

  // Cuota fija (solo capital + interés, sin cobros)
  let fixedPayment: number;
  if (monthlyRate === 0) {
    fixedPayment = round2(amount / termMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    fixedPayment = round2(amount * (monthlyRate * factor) / (factor - 1));
  }

  for (let period = 1; period <= termMonths; period++) {
    const interest = round2(balance * monthlyRate);
    let principal: number;

    if (period === termMonths) {
      // Última cuota: ajustar para cubrir exactamente el saldo restante
      principal = round2(balance);
    } else {
      principal = round2(fixedPayment - interest);
    }

    balance = round2(balance - principal);

    // Asegurar que el saldo no sea negativo por redondeo
    if (balance < 0) balance = 0;

    const payment = round2(principal + interest + monthlyChargesTotal);

    schedule.push({
      period,
      payment,
      principal,
      interest,
      charges: monthlyChargesTotal,
      balance,
    });
  }

  return schedule;
}

// ------------------------------------------------------------
// Método Alemán — Capital constante
// ------------------------------------------------------------

/**
 * Calcula la tabla de amortización con el método Alemán.
 *
 * Amortización de capital constante:
 *   A = P / n
 *
 * Cuota variable:
 *   C_k = A + I_k + cobros
 *   I_k = saldo_k × i
 */
function simulateGerman(
  amount: number,
  termMonths: number,
  monthlyRate: number,
  monthlyChargesTotal: number
): PaymentRow[] {
  const schedule: PaymentRow[] = [];
  let balance = amount;

  const fixedPrincipal = round2(amount / termMonths);

  for (let period = 1; period <= termMonths; period++) {
    const interest = round2(balance * monthlyRate);
    let principal: number;

    if (period === termMonths) {
      // Última cuota: ajustar para cubrir exactamente el saldo restante
      principal = round2(balance);
    } else {
      principal = fixedPrincipal;
    }

    balance = round2(balance - principal);

    if (balance < 0) balance = 0;

    const payment = round2(principal + interest + monthlyChargesTotal);

    schedule.push({
      period,
      payment,
      principal,
      interest,
      charges: monthlyChargesTotal,
      balance,
    });
  }

  return schedule;
}

// ------------------------------------------------------------
// Función principal
// ------------------------------------------------------------

/**
 * Ejecuta la simulación completa de un crédito.
 *
 * @param request - Parámetros de la simulación
 * @returns Resultado completo con tabla de amortización y totales
 */
export function simulate(request: SimulationRequest): SimulationResult {
  const {
    amount,
    termMonths,
    annualInterestRate,
    amortizationMethod,
    creditTypeName = "General",
    additionalCharges = [],
  } = request;

  // Tasa mensual (de porcentaje anual a decimal mensual)
  const monthlyRate = annualInterestRate / 100 / 12;

  // Combinar cobros obligatorios + adicionales
  const allChargeInputs: IndirectChargeInput[] = [
    ...getDefaultCharges(),
    ...additionalCharges,
  ];

  // Calcular montos mensuales de cada cobro
  const calculatedCharges = calculateCharges(amount, allChargeInputs);
  const monthlyChargesTotal = totalMonthlyCharges(calculatedCharges);

  // Generar tabla de amortización según el método
  let schedule: PaymentRow[];

  switch (amortizationMethod) {
    case "FRENCH":
      schedule = simulateFrench(amount, termMonths, monthlyRate, monthlyChargesTotal);
      break;
    case "GERMAN":
      schedule = simulateGerman(amount, termMonths, monthlyRate, monthlyChargesTotal);
      break;
    default:
      throw new Error(`Método de amortización no soportado: ${amortizationMethod}`);
  }

  // Calcular totales
  const totalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0)
  );
  const totalCharges = round2(
    schedule.reduce((sum, row) => sum + row.charges, 0)
  );
  const totalPayment = round2(
    schedule.reduce((sum, row) => sum + row.payment, 0)
  );

  return {
    method: amortizationMethod,
    creditType: creditTypeName,
    amount,
    termMonths,
    annualInterestRate,
    monthlyRate: round2(monthlyRate * 100), // Devolver como porcentaje
    totalPayment,
    totalInterest,
    totalCharges,
    schedule,
    charges: calculatedCharges,
  };
}
