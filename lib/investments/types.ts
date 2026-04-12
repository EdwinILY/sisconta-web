export type RequestStatus =
  | "PENDING"
  | "DOCUMENTS_UPLOADED"
  | "BIOMETRIC_VALIDATED"
  | "APPROVED"
  | "REJECTED";

export type CapitalizationFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "ANNUAL";

export type InvestmentProduct = {
  id: string;
  name: string;
  purpose?: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualRate: number;
  allowOutOfMargin: boolean;
  capitalizationFreq: CapitalizationFrequency;
  createdAt?: string;
  updatedAt?: string;
};

export type InvestmentSimulationInput = {
  amount: number;
  termMonths: number;
};

export type InvestmentProjectionRow = {
  month: number;
  initialBalance: number;
  interest: number;
  finalBalance: number;
};

export type InvestmentSimulationResult = {
  productId: string;
  productName: string;
  purpose?: string;
  amount: number;
  termMonths: number;
  annualRate: number;
  monthlyRate: number;
  maturityAmount: number;
  totalInterest: number;
  capitalizationFreq: CapitalizationFrequency;
  allowOutOfMargin: boolean;
  outOfMargin: boolean;
  warnings: string[];
  projection: InvestmentProjectionRow[];
  configuredRange: {
    minAmount: number;
    maxAmount: number;
    minTermMonths: number;
    maxTermMonths: number;
  };
};

export type InvestmentRequestDocument = {
  id: string;
  type: string;
  fileName?: string;
  fileUrl?: string;
  createdAt?: string;
};

export type BiometricValidation = {
  modality: "FACE" | "VOICE" | "FINGERPRINT";
  result: "SUCCESS" | "FAILED";
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type InvestmentRequest = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  termMonths: number;
  acceptTerms: boolean;
  status: RequestStatus;
  documents?: InvestmentRequestDocument[];
  biometricValidation?: BiometricValidation;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInvestmentProductInput = {
  name: string;
  purpose: string;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualRate: number;
  allowOutOfMargin: boolean;
  capitalizationFreq: CapitalizationFrequency;
};

export type UpdateInvestmentProductInput =
  Partial<CreateInvestmentProductInput>;

export type CreateInvestmentRequestInput = {
  userId: string;
  productId: string;
  amount: number;
  termMonths: number;
  acceptTerms: true;
};

export type BiometricValidationInput = {
  modality: "FACE" | "VOICE" | "FINGERPRINT";
  forceResult: "SUCCESS" | "FAILED";
  metadata?: Record<string, unknown>;
};
