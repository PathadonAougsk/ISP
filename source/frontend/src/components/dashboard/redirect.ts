export type RequestTableTarget = "task" | "ticket";

// buildRequestTableUrl("task", 12) -> "/request-table?type=task&id=12"
export function buildRequestTableUrl(type: RequestTableTarget, id: number) {
  return `/request-table?type=${type}&id=${id}`;
}
