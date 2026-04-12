import { apiClient } from "@/lib/api/client";
import { BiometricValidationInput, CreateInvestmentProductInput, CreateInvestmentRequestInput, InvestmentProduct, InvestmentRequest, InvestmentSimulationInput, InvestmentSimulationResult, RequestStatus, UpdateInvestmentProductInput } from "@/lib/investments/types";

export async function listInvestmentProducts() {
  const { data } = await apiClient.get<InvestmentProduct[]>("/investment-products");
  return data;
}

export async function getInvestmentProduct(id: string) {
  const { data } = await apiClient.get<InvestmentProduct>(`/investment-products/${id}`);
  return data;
}

export async function createInvestmentProduct(payload: CreateInvestmentProductInput) {
  const { data } = await apiClient.post<InvestmentProduct>("/investment-products", payload);
  return data;
}

export async function updateInvestmentProduct(id: string, payload: UpdateInvestmentProductInput) {
  const { data } = await apiClient.patch<InvestmentProduct>(`/investment-products/${id}`, payload);
  return data;
}

export async function simulateInvestmentProduct(productId: string, payload: InvestmentSimulationInput) {
  const { data } = await apiClient.post<InvestmentSimulationResult>(`/investment-products/${productId}/simulate`, payload);
  return data;
}

export async function createInvestmentRequest(payload: CreateInvestmentRequestInput) {
  const { data } = await apiClient.post<InvestmentRequest>("/investment-requests", payload);
  return data;
}

export async function listInvestmentRequests() {
  const { data } = await apiClient.get<InvestmentRequest[]>("/investment-requests");
  return data;
}

export async function getInvestmentRequest(id: string) {
  const { data } = await apiClient.get<InvestmentRequest>(`/investment-requests/${id}`);
  return data;
}

export async function uploadInvestmentRequestDocument(requestId: string, type: string, file: File) {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);

  const { data } = await apiClient.post<InvestmentRequest>(`/investment-requests/${requestId}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function validateInvestmentRequestBiometrics(requestId: string, payload: BiometricValidationInput) {
  const { data } = await apiClient.post<InvestmentRequest>(`/investment-requests/${requestId}/biometric-validation`, payload);

  return data;
}

export async function updateInvestmentRequestStatus(requestId: string, status: Extract<RequestStatus, "APPROVED" | "REJECTED">) {
  const { data } = await apiClient.patch<InvestmentRequest>(`/investment-requests/${requestId}/status`, { status });

  return data;
}
