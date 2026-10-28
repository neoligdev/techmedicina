import { draftMoneySchema } from "./contracts";
/** Exact decimal entry to integer cents; blank is undecided, not free. */
export function parseDraftMoney(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  if (!/^(0|[1-9][0-9]{0,9})([.,][0-9]{1,2})?$/.test(value))
    throw new Error("Use valor em reais com até duas casas decimais");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return draftMoneySchema.parse(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function formatDraftMoney(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}
