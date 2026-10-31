import { medicalHistoryCursorSchema, medicalEvolutionHistorySchema } from "./history-contract";
import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { evolutionCommandSchema } from "./evolution-contract";
import { medicalEvolutionResultSchema, medicalViewerSchema } from "./evolution-api-contract";
export class MedicalEvolutionWriteError extends Error {
  constructor(
    public readonly outcome: "rejected" | "uncertain",
    public readonly status?: number,
  ) {
    super(
      outcome === "uncertain"
        ? "Resultado não confirmado; consulte o ID original"
        : "Registro não autorizado ou inválido",
    );
  }
}
/** Local client only. Future route must use the verified clinical resolver; never a demo context. */
export function createMedicalEvolutionClient(
  viewerValue: unknown,
  getSession: () => Promise<{ userId: string; accessToken: string } | null>,
  fetcher: typeof fetch = fetch,
) {
  const viewer = medicalViewerSchema.parse(viewerValue);
  let closed = false;
  const pending = new Set<AbortController>();
  const run = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    pending.add(controller);
    try {
      return await withRequestDeadline(async (deadline) => {
        const abort = () => controller.abort();
        if (deadline.aborted) abort();
        deadline.addEventListener("abort", abort, { once: true });
        try {
          return await operation(controller.signal);
        } finally {
          deadline.removeEventListener("abort", abort);
        }
      });
    } finally {
      controller.abort();
      pending.delete(controller);
    }
  };
  const token = async (signal: AbortSignal) => {
    const session = await getSession();
    if (
      closed ||
      signal.aborted ||
      !session ||
      session.userId !== viewer.userId ||
      !session.accessToken
    )
      throw new Error("Medical session unavailable");
    return session.accessToken;
  };
  const validate = (raw: unknown, id: string) => {
    const { result } = z.object({ result: medicalEvolutionResultSchema }).strict().parse(raw);
    if (
      result.id !== id ||
      result.clinicId !== viewer.clinicId ||
      result.patientId !== viewer.patientId
    )
      throw new Error("Unexpected medical result");
    return result;
  };
  return {
    close() {
      closed = true;
      for (const request of pending) request.abort();
    },
    async create(commandValue: unknown) {
      const command = evolutionCommandSchema.parse(commandValue);
      let dispatched = false;
      try {
        return await run(async (signal) => {
          const bearer = await token(signal);
          dispatched = true;
          const response = await fetcher("/api/medical/evolutions", {
            method: "POST",
            headers: { Authorization: "Bearer " + bearer, "Content-Type": "application/json" },
            body: JSON.stringify(command),
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
            signal,
          });
          if (!response.ok)
            throw new MedicalEvolutionWriteError(
              [400, 401, 403, 405, 413, 415].includes(response.status) ? "rejected" : "uncertain",
              response.status,
            );
          const result = validate(await response.json(), command.id);
          if (
            closed ||
            signal.aborted ||
            result.author.userId !== viewer.userId ||
            result.text !== command.text ||
            result.supplementsId !== command.supplementsId
          )
            throw new Error("Medical result not confirmed");
          return result;
        });
      } catch (error) {
        if (error instanceof MedicalEvolutionWriteError) throw error;
        throw new MedicalEvolutionWriteError(dispatched ? "uncertain" : "rejected");
      }
    },
    async history(cursorValue: unknown = null) {
      const cursor = medicalHistoryCursorSchema.nullable().parse(cursorValue);
      return run(async (signal) => {
        const bearer = await token(signal),
          query = new URLSearchParams(
            cursor ? { beforeRecordedAt: cursor.recordedAt, beforeId: cursor.id } : {},
          );
        const response = await fetcher(
          "/api/medical/evolutions" + (query.size ? "?" + query : ""),
          {
            method: "GET",
            headers: { Authorization: "Bearer " + bearer },
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
            signal,
          },
        );
        if (!response.ok) throw new Error("Medical history unavailable");
        const { result: page } = z
          .object({ result: medicalEvolutionHistorySchema })
          .strict()
          .parse(await response.json());
        let previous = cursor;
        const compare = (
          a: { recordedAt: string; id: string },
          b: { recordedAt: string; id: string },
        ) =>
          Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
          (a.id.toLowerCase() < b.id.toLowerCase()
            ? -1
            : a.id.toLowerCase() > b.id.toLowerCase()
              ? 1
              : 0);
        for (const row of page.items) {
          validate({ result: row }, row.id);
          if (previous !== null && compare(row, previous) >= 0)
            throw new Error("Unexpected medical history order");
          previous = { recordedAt: row.recordedAt, id: row.id };
        }
        if (
          page.nextCursor !== null &&
          (page.items.length !== 100 ||
            previous === null ||
            compare(page.nextCursor, previous) !== 0)
        )
          throw new Error("Unexpected medical history cursor");
        if (closed || signal.aborted) throw new Error("Medical history unavailable");
        return page;
      });
    },
    async confirm(commandValue: unknown) {
      const command = evolutionCommandSchema.parse(commandValue);
      return run(async (signal) => {
        const bearer = await token(signal),
          query = new URLSearchParams({ id: command.id });
        const response = await fetcher("/api/medical/evolutions?" + query, {
          method: "GET",
          headers: { Authorization: "Bearer " + bearer },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal,
        });
        if (closed || signal.aborted) throw new Error("Medical confirmation unavailable");
        if (response.status === 404) return { outcome: "unconfirmed" as const, record: null };
        if (!response.ok) throw new Error("Medical confirmation unavailable");
        const record = validate(await response.json(), command.id);
        if (closed || signal.aborted) throw new Error("Medical confirmation unavailable");
        const matches =
          record.author.userId === viewer.userId &&
          record.text === command.text &&
          record.supplementsId === command.supplementsId;
        return { outcome: matches ? ("confirmed" as const) : ("conflict" as const), record };
      });
    },
  };
}
