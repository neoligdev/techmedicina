import { expect, it } from "vitest";
import { parsePersistedJourneyEvent } from "../lib/journey/persisted-event";
const id = "00000000-0000-4000-8000-000000000001";
const row = {
  id,
  clinic_id: id,
  patient_id: id,
  goal_id: id,
  goal_version: 2,
  policy_version_id: id,
  source_event_id: id,
  source: "self_report",
  actor_user_id: id,
  occurred_at: "2026-10-12T09:00:00-03:00",
  received_at: "2026-10-12T12:01:00+00:00",
};
it("normaliza offsets para UTC e preserva identidade e snapshots", () => {
  const parsed = parsePersistedJourneyEvent(row);
  expect(parsed.id).toBe(id);
  expect(parsed.event.occurredAt).toBe("2026-10-12T12:00:00.000Z");
  expect(parsed.event.receivedAt).toBe("2026-10-12T12:01:00.000Z");
  expect(parsed.event.goalVersion).toBe(2);
});
it.each([
  { ...row, points: 100 },
  { ...row, source: "device" },
  { ...row, goal_version: 0 },
  { ...row, actor_user_id: "invalid" },
  { ...row, occurred_at: "2026-10-12T12:00:00" },
  { ...row, occurred_at: "2026-10-12T12:02:00Z" },
])("recusa respostas inválidas ou campos não contratados", (value) => {
  expect(() => parsePersistedJourneyEvent(value)).toThrow();
});
