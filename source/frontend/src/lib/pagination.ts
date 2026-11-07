export const PAGE_SIZE = 30;

// Ask for one extra row so we know whether a next page exists
export function pageParams(page: number) {
  return { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE + 1 };
}

export function splitPage<T>(rows: T[]) {
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE };
}
