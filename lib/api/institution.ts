import { apiClient, getApiErrorInfo } from "./client";
import { getToken } from "./auth";

export type Institution = {
  id: string;
  name: string;
  ruc?: string;
  contact?: string;
  logo?: string;
};

export async function getInstitution(): Promise<Institution> {
  try {
    const response = await apiClient.get<Institution>("/institution");
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function createInstitution(data: {
  name: string;
  ruc?: string;
  contact?: string;
}): Promise<Institution> {
  try {
    const token = getToken();
    const response = await apiClient.post<Institution>("/institution", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function updateInstitution(
  id: string,
  data: Partial<{
    name: string;
    ruc: string;
    contact: string;
  }>
): Promise<Institution> {
  try {
    const token = getToken();
    const response = await apiClient.patch<Institution>(
      `/institution/${id}`,
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

export async function uploadLogo(id: string, file: File): Promise<Institution> {
  try {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<Institution>(
      `/institution/${id}/logo`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}
