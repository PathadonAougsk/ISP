const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
