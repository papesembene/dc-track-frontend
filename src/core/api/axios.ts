import axios, { AxiosError } from "axios";
import { env } from "@/core/config/env";
import { tokenStorage } from "@/core/auth/token-storage";

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
});

function isTechnicalMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes("axioserror") ||
    lowerMessage.includes("request failed") ||
    lowerMessage.includes("should not exist") ||
    lowerMessage.includes("property ") ||
    lowerMessage.includes("prismaclient") ||
    lowerMessage.includes("stack trace")
  );
}

function normalizeApiMessage(
  message: string | string[] | undefined,
  fallback: string,
) {
  if (Array.isArray(message)) {
    const safeMessages = message
      .filter((item) => !isTechnicalMessage(item))
      .map((item) => item.trim())
      .filter(Boolean);

    return safeMessages.length > 0 ? safeMessages.join(", ") : fallback;
  }

  if (typeof message === "string" && message.trim().length > 0) {
    const trimmedMessage = message.trim();
    return isTechnicalMessage(trimmedMessage) ? fallback : trimmedMessage;
  }

  return fallback;
}

function setResponseMessage(
  error: AxiosError<{ message?: string | string[]; error?: { message?: string } }>,
  message: string,
) {
  if (error.response?.data) {
    error.response.data.message = message;
  }
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: { message?: string } }>) => {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.message;
    const nestedMessage = error.response?.data?.error?.message;
    const fallbackMessage =
      status && status >= 500
        ? "Une erreur serveur est survenue. Veuillez reessayer."
        : "Impossible de traiter la demande. Veuillez verifier les informations et reessayer.";

    if (error.code === "ECONNABORTED") {
      error.message =
        "Le serveur met trop de temps a repondre. Veuillez reessayer.";
      return Promise.reject(error);
    }

    if (!error.response) {
      error.message =
        "Le serveur est injoignable pour le moment. Verifiez votre connexion ou reessayez plus tard.";
      return Promise.reject(error);
    }

    if (status === 401) {
      tokenStorage.clear();
      localStorage.removeItem("role");
      error.message = "Votre session a expire. Veuillez vous reconnecter.";
      return Promise.reject(error);
    }

    if (status === 403) {
      error.message = "Vous n'avez pas les droits pour acceder a cette ressource.";
      setResponseMessage(error, error.message);
      return Promise.reject(error);
    }

    if (status === 503) {
      error.message =
        "Service temporairement indisponible. Veuillez reessayer dans quelques instants.";
      return Promise.reject(error);
    }

    if (Array.isArray(apiMessage)) {
      error.message = normalizeApiMessage(apiMessage, fallbackMessage);
      setResponseMessage(error, error.message);
      return Promise.reject(error);
    }

    if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
      error.message = normalizeApiMessage(apiMessage, fallbackMessage);
      setResponseMessage(error, error.message);
      return Promise.reject(error);
    }

    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      error.message = normalizeApiMessage(nestedMessage, fallbackMessage);
      setResponseMessage(error, error.message);
      return Promise.reject(error);
    }

    error.message = "Une erreur serveur est survenue. Veuillez reessayer.";
    return Promise.reject(error);
  },
);
