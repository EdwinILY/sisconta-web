// ============================================================
// Tipos del dominio — Simulador de crédito
// ============================================================

/** Método de amortización soportado */
export type AmortizationMethod = "FRENCH" | "GERMAN";

/** Tipo de cobro indirecto: fijo (USD) o porcentual (% sobre monto) */
export type ChargeType = "FIXED" | "PERCENTAGE";

// ------------------------------------------------------------
// Cobros indirectos
// ------------------------------------------------------------

/**
 * Representa un cobro indirecto asociado a un crédito.
 *
 * Para agregar nuevos cobros (seguros, donaciones, comisiones),
 * basta con crear un nuevo objeto de este tipo y añadirlo al
 * array de cobros. No se necesita modificar funciones existentes.
 *
 * @example
 * const seguroDesgravamen: IndirectChargeInput = {
 *   name: "Seguro de Desgravamen",
 *   type: "PERCENTAGE",
 *   value: 0.065,
 *   mandatory: true,
 * };
 */
export interface IndirectChargeInput {
  /** Nombre descriptivo del cobro */
  name: string;
  /** FIXED = valor fijo mensual en USD, PERCENTAGE = % anual sobre el monto del crédito */
  type: ChargeType;
  /** Valor del cobro (en USD si FIXED, en porcentaje si PERCENTAGE, ej: 0.5 = 0.5%) */
  value: number;
  /** Si es obligatorio, no puede ser removido por el usuario */
  mandatory: boolean;
}

/**
 * Cobro indirecto calculado con su monto mensual resultante.
 */
export interface CalculatedCharge {
  name: string;
  type: ChargeType;
  value: number;
  mandatory: boolean;
  /** Monto mensual que se suma a cada cuota */
  monthlyAmount: number;
}

// ------------------------------------------------------------
// Request / Response del simulador
// ------------------------------------------------------------

/**
 * Parámetros de entrada para la simulación de crédito.
 */
export interface SimulationRequest {
  /** Monto del crédito en USD */
  amount: number;
  /** Plazo en meses */
  termMonths: number;
  /** Tasa de interés anual (ej: 15.5 = 15.5%) */
  annualInterestRate: number;
  /** Método de amortización */
  amortizationMethod: AmortizationMethod;
  /** Nombre del tipo de crédito (informativo) */
  creditTypeName?: string;
  /** Cobros indirectos adicionales (además de los obligatorios) */
  additionalCharges?: IndirectChargeInput[];
}

/**
 * Una fila del cronograma de pagos (tabla de amortización).
 */
export interface PaymentRow {
  /** Número de cuota (1-indexed) */
  period: number;
  /** Cuota total del periodo (capital + interés + cobros) */
  payment: number;
  /** Abono a capital */
  principal: number;
  /** Interés del periodo */
  interest: number;
  /** Total de cobros indirectos del periodo */
  charges: number;
  /** Saldo de capital después del pago */
  balance: number;
}

/**
 * Resultado completo de la simulación.
 */
export interface SimulationResult {
  /** Método de amortización utilizado */
  method: AmortizationMethod;
  /** Tipo de crédito */
  creditType: string;
  /** Monto original del crédito */
  amount: number;
  /** Plazo en meses */
  termMonths: number;
  /** Tasa de interés anual */
  annualInterestRate: number;
  /** Tasa de interés mensual */
  monthlyRate: number;
  /** Total a pagar (capital + intereses + cobros) */
  totalPayment: number;
  /** Total de intereses pagados */
  totalInterest: number;
  /** Total de cobros indirectos pagados */
  totalCharges: number;
  /** Cronograma de pagos completo */
  schedule: PaymentRow[];
  /** Detalle de cobros indirectos aplicados */
  charges: CalculatedCharge[];
}
