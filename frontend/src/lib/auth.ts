const JWT_STORAGE_KEY = "jwt";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(JWT_STORAGE_KEY, token);
  } catch {
    // localStorage unavailable (private mode, blocked cookies, etc.) - ignore
  }
}
