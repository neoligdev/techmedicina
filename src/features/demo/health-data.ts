// Fictitious fixtures only. No device capability or clinical interpretation is implied.
export interface BodyReading {
  at: string;
  weight: number;
  fat: number;
  muscle: number;
  water: number;
}
export interface ActivityReading {
  day: string;
  steps: number;
  sleep: number;
}
export const bodyHistory: readonly BodyReading[] = [
  { at: "2026-09-18T07:30:00-03:00", weight: 79.6, fat: 25.6, muscle: 31.8, water: 53.6 },
  { at: "2026-09-21T07:30:00-03:00", weight: 79.4, fat: 25.4, muscle: 31.9, water: 53.8 },
  { at: "2026-09-24T07:30:00-03:00", weight: 79.5, fat: 25.5, muscle: 31.8, water: 53.7 },
  { at: "2026-09-27T07:30:00-03:00", weight: 79.1, fat: 25.2, muscle: 32, water: 54 },
  { at: "2026-09-30T07:30:00-03:00", weight: 78.9, fat: 25.1, muscle: 32, water: 54.1 },
  { at: "2026-10-03T07:30:00-03:00", weight: 79, fat: 25.2, muscle: 32, water: 54 },
  { at: "2026-10-06T07:30:00-03:00", weight: 78.7, fat: 24.9, muscle: 32.1, water: 54.2 },
  { at: "2026-10-09T07:30:00-03:00", weight: 78.4, fat: 24.8, muscle: 32.1, water: 54.2 },
];
export const latestBody = bodyHistory[bodyHistory.length - 1]!;
export const bodyEstimates = { bone: 3.1, basalEnergy: 1680, visceralFatIndex: 9 } as const;
export const activityHistory: readonly ActivityReading[] = [
  { day: "03/10", steps: 4820, sleep: 6.8 },
  { day: "04/10", steps: 7310, sleep: 7.5 },
  { day: "05/10", steps: 5900, sleep: 7 },
  { day: "06/10", steps: 8100, sleep: 7.8 },
  { day: "07/10", steps: 5340, sleep: 6.9 },
  { day: "08/10", steps: 7100, sleep: 7.4 },
  { day: "09/10", steps: 6420, sleep: 7 + 20 / 60 },
];
export const heartHistory = [
  { hour: "06h", bpm: 64 },
  { hour: "08h", bpm: 76 },
  { hour: "10h", bpm: 82 },
  { hour: "12h", bpm: 74 },
  { hour: "14h", bpm: 88 },
  { hour: "16h", bpm: 78 },
  { hour: "18h", bpm: 72 },
] as const;
export const braceletReading = {
  at: "2026-10-09T18:00:00-03:00",
  bpm: 72,
  oxygen: 98,
  steps: 6420,
  distance: 4.8,
  activityEnergy: 310,
  sleepMinutes: 440,
} as const;
export const oxygenHistory = [
  { at: "2026-10-07T18:00:00-03:00", value: 97 },
  { at: "2026-10-08T18:00:00-03:00", value: 98 },
  { at: braceletReading.at, value: braceletReading.oxygen },
] as const;
export const demoProfile = {
  id: "demo-patient",
  name: "Alex · perfil demonstrativo",
  height: 1.75,
};
export const bmi = latestBody.weight / demoProfile.height ** 2;
export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
export function formatReadingTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
