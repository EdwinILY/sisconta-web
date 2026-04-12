import axios, { AxiosError } from "axios";

export const baseURL = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

export type ApiErrorInfo = {
  status: number;
  message: string;
};

const fallbackByStatus: Record<number, string> = {
  400: "Solicitud invalida. Revisa los datos enviados.",
  404: "Recurso no encontrado.",
  500: "Error interno del servidor.",
};

export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;
    const payload = error.response?.data;

    if (typeof payload === "string" && payload.trim()) {
      return { status, message: payload };
    }

    if (payload && typeof payload === "object") {
      const asRecord = payload as Record<string, unknown>;
      const message = asRecord.message;

      if (Array.isArray(message) && message.length > 0) {
        return { status, message: message.join(". ") };
      }

      if (typeof message === "string" && message.trim()) {
        return { status, message };
      }

      if (typeof asRecord.error === "string" && asRecord.error.trim()) {
        return { status, message: asRecord.error };
      }
    }

    return {
      status,
      message: fallbackByStatus[status] ?? "No se pudo completar la operacion.",
    };
  }

  return {
    status: 500,
    message: "No se pudo completar la operacion por un error inesperado.",
  };
}
