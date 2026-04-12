import { apiClient, getApiErrorInfo } from "./client";

export type User = {
  id: string;
  email: string;
  role: "ADMIN" | "CLIENT";
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });

    const { accessToken, user } = response.data;

    localStorage.setItem("sisconta_token", accessToken);
    localStorage.setItem("sisconta_user", JSON.stringify(user));

    // Guardar token en cookie
    document.cookie = `sisconta_token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`;

    return { accessToken, user };
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export async function register(
  email: string,
  password: string,
  role: string
): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/register", {
      email,
      password,
      role,
    });

    const { accessToken, user } = response.data;

    localStorage.setItem("sisconta_token", accessToken);
    localStorage.setItem("sisconta_user", JSON.stringify(user));

    // Guardar token en cookie
    document.cookie = `sisconta_token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`;

    return { accessToken, user };
  } catch (error) {
    throw getApiErrorInfo(error);
  }
}

export function logout(): void {
  localStorage.removeItem("sisconta_token");
  localStorage.removeItem("sisconta_user");

  // Eliminar token de cookie
  document.cookie = "sisconta_token=; path=/; max-age=0";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sisconta_token");
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const userJson = localStorage.getItem("sisconta_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
