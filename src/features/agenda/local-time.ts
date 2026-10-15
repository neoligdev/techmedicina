/** Convert a minute-precision clinic wall time into one unambiguous instant.
 * The clinic timezone is required; never fall back to browser/server timezone.
 */
export function clinicTimeToInstant(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Informe data e horário completos.");
  const fields = match.slice(1).map(Number);
  const [year, month, day, hour, minute] = fields as [number, number, number, number, number];
  if (year < 100 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59)
    throw new Error("Data ou horário inválido.");
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(wall);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("Data ou horário inválido.");
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error("Fuso da clínica indisponível.");
  }
  function localStamp(instant: number) {
    const parts = formatter.formatToParts(instant);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
  }
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours++) {
    const sample = wall + hours * 3600000;
    offsets.add(localStamp(sample) - sample);
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => localStamp(instant) === wall);
  if (candidates.length === 0)
    throw new Error("Este horário não existe no fuso da clínica. Escolha outro horário.");
  if (candidates.length !== 1)
    throw new Error("Este horário é ambíguo no fuso da clínica. Escolha outro horário.");
  return new Date(candidates[0]!).toISOString();
}
