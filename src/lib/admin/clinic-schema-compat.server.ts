import "@tanstack/react-start/server-only";

/** Rolling schema compatibility for reads only. Never replay writes or hide network,
 * permission or other database errors. An absent time_zone remains absent in DTOs. */
export async function readClinicWithOptionalTimeZone(
  baseColumns: string,
  read: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
) {
  const result = await read(`${baseColumns},time_zone`);
  if (result.error?.code !== "42703") return result;
  return read(baseColumns);
}
