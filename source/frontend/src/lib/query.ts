// params -> query string. skip undefined, other value become string
// key name must match the backend param name
export function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  return query;
}
