import { apiClient, getApiErrorInfo } from "./client";
import { getToken } from "./auth";

export type CreditType = {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  annualInterestRate: number;
  amortizationSystems: string[];
  institutionId: string;
};

export async function getCreditTypes(): Promise<CreditType[]> {
  try {
    const response = await apiClient.get<CreditType[]>("/credit-types");
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function getCreditType(id: string): Promise<CreditType> {
  try {
    const response = await apiClient.get<CreditType>(`/credit-types/${id}`);
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function createCreditType(data: {
  name: string;
  minAmount: number;
  maxAmount: number;
  annualInterestRate: number;
  amortizationSystems: string[];
  institutionId: string;
}): Promise<CreditType> {
  try {
    const token = getToken();
    const response = await apiClient.post<CreditType>("/credit-types", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function updateCreditType(
  id: string,
  data: Partial<{
    name: string;
    minAmount: number;
    maxAmount: number;
    annualInterestRate: number;
    amortizationSystems: string[];
  }>
): Promise<CreditType> {
  try {
    const token = getToken();
    const response = await apiClient.patch<CreditType>(
      `/credit-types/${id}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function deleteCreditType(id: string): Promise<void> {
  try {
    const token = getToken();
    await apiClient.delete(`/credit-types/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}
