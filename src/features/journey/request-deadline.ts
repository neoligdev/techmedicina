import { withRequestDeadline } from "@/lib/http/request-deadline";
/** Preserve the original Journey timeout contract. */
export function withJourneyDeadline<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  return withRequestDeadline(operation, "Journey request expired");
}
