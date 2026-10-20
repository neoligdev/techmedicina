import { isValidIanaTimeZone } from "./local-time";

export interface TimeZoneOption {
  value: string;
  label: string;
  region: string;
}

export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  {
    value: "America/Sao_Paulo",
    label: "Horário de Brasília (São Paulo, RJ, Sul, Sudeste, DF)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Bahia",
    label: "Salvador (Bahia)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Recife",
    label: "Recife (Pernambuco, Paraíba, RN)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Fortaleza",
    label: "Fortaleza (Ceará, Maranhão, Piauí)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Belem",
    label: "Belém (Pará, Amapá)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Maceio",
    label: "Maceió (Alagoas, Sergipe)",
    region: "Brasil (UTC-3)",
  },
  {
    value: "America/Manaus",
    label: "Manaus (Amazonas)",
    region: "Brasil (UTC-4)",
  },
  {
    value: "America/Cuiaba",
    label: "Cuiabá (Mato Grosso, MS)",
    region: "Brasil (UTC-4)",
  },
  {
    value: "America/Porto_Velho",
    label: "Porto Velho (Rondônia)",
    region: "Brasil (UTC-4)",
  },
  {
    value: "America/Boa_Vista",
    label: "Boa Vista (Roraima)",
    region: "Brasil (UTC-4)",
  },
  {
    value: "America/Rio_Branco",
    label: "Rio Branco (Acre)",
    region: "Brasil (UTC-5)",
  },
  {
    value: "America/Noronha",
    label: "Fernando de Noronha",
    region: "Brasil (UTC-2)",
  },
  {
    value: "UTC",
    label: "Tempo Universal Coordenado (UTC)",
    region: "Global (UTC+0)",
  },
];

export function formatTimeZoneLabel(timeZone: string | null | undefined): string {
  if (!timeZone || timeZone.trim().length === 0) {
    return "Não configurado";
  }
  const normalized = timeZone.trim();
  const option = COMMON_TIME_ZONES.find((item) => item.value === normalized);
  if (option) {
    return `${option.label} (${normalized})`;
  }
  if (isValidIanaTimeZone(normalized)) {
    return normalized;
  }
  return `${normalized} (inválido)`;
}
