export const LOGIN_ID_HINT = "영문 소문자·숫자와 . _ - 를 써서 4~50자로 입력해 주세요. 대문자는 소문자로 바뀌어요.";
export const PASSWORD_HINT = "8자 이상, 영문자와 숫자를 포함해 주세요. 공백 없이 최대 72바이트까지 쓸 수 있어요.";

export function normalizeLoginId(value: string): string { return value.trim().toLowerCase(); }

export function loginIdError(value: string): string | undefined {
  const id = normalizeLoginId(value);
  if (!id) return "아이디를 입력해 주세요.";
  if (!/^[a-z0-9._-]{4,50}$/.test(id)) return LOGIN_ID_HINT;
  return undefined;
}

/** BE PasswordPolicy와 같은 기준. 서버도 모든 요청에 다시 검사한다. */
export function passwordError(value: string): string | undefined {
  if (value.length < 8) return "비밀번호는 8자 이상이어야 해요.";
  if (new TextEncoder().encode(value).length > 72) return "비밀번호가 너무 길어요. 72바이트 이하로 입력해 주세요.";
  if (/\s/u.test(value)) return "비밀번호에는 공백을 넣을 수 없어요.";
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return "비밀번호에는 영문자와 숫자를 함께 넣어 주세요.";
  return undefined;
}
