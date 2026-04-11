// ============================================================
// Módulo de simulación de crédito — Exports
// ============================================================

export { simulate } from "./amortization";
export {
  getDefaultCharges,
  calculateCharges,
  totalMonthlyCharges,
  SOLCA_CHARGE,
} from "./charges";
export type {
  AmortizationMethod,
  ChargeType,
  IndirectChargeInput,
  CalculatedCharge,
  SimulationRequest,
  SimulationResult,
  PaymentRow,
} from "./types";
