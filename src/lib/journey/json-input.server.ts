import "@tanstack/react-start/server-only";
import { readBoundedJson } from "../http/json-input.server";
/** Existing Journey commands retain their 4 KiB limit. */
export function readJourneyJson(request: Request): Promise<unknown> {
  return readBoundedJson(request, 4096);
}
