import { apiClient, getApiErrorInfo } from "./client";
import { getToken } from "./auth";

export type Charge = {
  id: string;
  name: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  mandatory: boolean;
  creditTypeId: string;
};

export async function getChargesByCreditType(
  creditTypeId: string
): Promise<Charge[]> {
  try {
    const response = await apiClient.get<Charge[]>(
      `/charges/credit-type/${creditTypeId}`
    );
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function createCharge(data: {
  name: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  mandatory: boolean;
  creditTypeId: string;
}): Promise<Charge> {
  try {
    const token = getToken();
    const response = await apiClient.post<Charge>("/charges", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function updateCharge(
  id: string,
  data: Partial<{
    name: string;
    type: "FIXED" | "PERCENTAGE";
    value: number;
    mandatory: boolean;
  }>
): Promise<Charge> {
  try {
    const token = getToken();
    const response = await apiClient.patch<Charge>(`/charges/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function deleteCharge(id: string): Promise<void> {
  try {
    const token = getToken();
    await apiClient.delete(`/charges/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}
