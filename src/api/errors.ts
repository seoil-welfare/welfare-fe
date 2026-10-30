/** API 실패. 화면은 status로 분기하고 message를 사용자 안내에 쓴다 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** 일지를 불러온 뒤 다른 사람이 먼저 저장함 (409, 명세 4.6) */
export function isUpdatedByOther(error: unknown): boolean {
  return isApiError(error) && error.code === "DIARY_UPDATED_BY_OTHER";
}

/** 네트워크 끊김 등 응답 자체를 받지 못한 경우 status 0 */
export const NETWORK_ERROR_STATUS = 0;

export function errorMessage(error: unknown, fallback = "잠시 후 다시 시도해 주세요."): string {
  if (isApiError(error)) {
    if (error.status === NETWORK_ERROR_STATUS) return "네트워크 상태를 확인해 주세요.";
    return error.message || fallback;
  }
  return fallback;
}
