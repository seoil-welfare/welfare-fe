import { API_BASE_URL } from "@/config";
import { ApiError, NETWORK_ERROR_STATUS } from "@/api/errors";

/**
 * fetch 래퍼.
 * 인증은 쿠키 세션을 기본으로 가정한다(credentials: include). 토큰 방식으로 정해지면
 * configureHttp({ getToken })로 Authorization 헤더를 붙인다. 인증 방식은 백엔드와 확정할 사항이다.
 */

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

interface HttpHooks {
  getToken?: () => string | null;
  /** 401 응답 시 호출한다. 로그인 화면 이동 등은 앱이 정한다 */
  onUnauthorized?: () => void;
  /** 403 ACCOUNT_DISABLED 응답 시 호출한다. 로그인한 뒤에 계정이 사용 중지된 경우 */
  onAccountDisabled?: () => void;
}

let hooks: HttpHooks = {};

export function configureHttp(next: HttpHooks): void {
  hooks = { ...hooks, ...next };
}

function buildUrl(path: string, query?: Query): string {
  const url = API_BASE_URL + path;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? url + "?" + qs : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = hooks.getToken?.();
  if (token) headers.Authorization = "Bearer " + token;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(NETWORK_ERROR_STATUS, "네트워크 상태를 확인해 주세요.");
  }

  if (response.status === 401) hooks.onUnauthorized?.();

  if (!response.ok) {
    const payload = await readJson<{ message?: string; code?: string }>(response);
    if (response.status === 403 && payload?.code === "ACCOUNT_DISABLED") hooks.onAccountDisabled?.();
    throw new ApiError(
      response.status,
      payload?.message ?? defaultMessage(response.status),
      payload?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await readJson<T>(response)) as T;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function defaultMessage(status: number): string {
  if (status === 401) return "로그인이 필요해요.";
  if (status === 403) return "이 작업을 할 권한이 없어요.";
  if (status === 404) return "찾을 수 없어요.";
  if (status === 409) return "다른 변경과 충돌했어요. 새로고침 후 다시 시도해 주세요.";
  if (status >= 500) return "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  return "요청을 처리하지 못했어요.";
}
