import type { ApiValidationIssues } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "")
  ?? "http://localhost:3000";

let unauthorizedHandler: (() => void) | undefined;

export class ApiError extends Error {
  status: number;
  issues: ApiValidationIssues | null;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown, issues: ApiValidationIssues | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function extractIssues(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.issues)) {
    return null;
  }

  const issues = payload.issues;
  const formErrors = Array.isArray(issues.formErrors)
    ? issues.formErrors.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  const fieldErrors = isRecord(issues.fieldErrors)
    ? Object.fromEntries(
      Object.entries(issues.fieldErrors).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [],
      ]),
    )
    : undefined;

  const result: ApiValidationIssues = {};

  if (formErrors !== undefined) {
    result.formErrors = formErrors;
  }

  if (fieldErrors !== undefined) {
    result.fieldErrors = fieldErrors;
  }

  return result;
}

function extractMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function apiRequest<TResponse>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
) {
  const { body, ...restInit } = init ?? {};
  const headers = new Headers(init?.headers);
  const requestInit: RequestInit = {
    ...restInit,
    credentials: "include",
    headers,
  };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Errore di rete.",
      0,
      null,
    );
  }

  const rawBody = response.status === 204 ? "" : await response.text();
  const payload = rawBody ? safeParseJson(rawBody) : null;

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiError(
      extractMessage(payload, "Richiesta non riuscita."),
      response.status,
      payload,
      extractIssues(payload),
    );
  }

  return payload as TResponse;
}

export function buildQueryString(params: object) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}