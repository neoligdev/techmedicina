import "@tanstack/react-start/server-only";
import { AuthError } from "../auth/guards.server";

/** Shared, bounded input for small Journey commands; never trust Content-Length. */
export async function readJourneyJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    throw new AuthError("JSON required", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Input required", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new AuthError("Input too large", 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new AuthError("Invalid JSON", 400);
  }
}
