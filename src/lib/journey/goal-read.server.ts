import "@tanstack/react-start/server-only";
import { z } from "zod";
import { isAuthorized, type AuthContext, type PatientLinkMeta } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { storedGoalSchema } from "./goal-pause.server";
import { journeyGoalViewSchema } from "@/features/journey/goal-pause";
const titles = {
  hydration: "Hidratação",
  nutrition: "Alimentação",
  sleep: "Sono",
  emotion: "Bem-estar emocional",
  medication: "Medicação",
  activity: "Atividade",
  check_in: "Check-in",
  protocol: "Protocolo",
};

/** Read repository must use tm_get_journey_goal_for_doctor with the same bearer and host clinic. */
export async function readJourneyGoalForDoctor(
  context: AuthContext,
  goalId: unknown,
  read: (
    context: AuthContext,
    goalId: string,
  ) => Promise<{ goal: unknown; patientLink: PatientLinkMeta } | null>,
) {
  const id = z.string().uuid().safeParse(goalId);
  if (!id.success) throw new AuthError("Invalid goal input", 400);
  const links = context.identity.links.filter(
    (link) => link.clinicId === context.currentClinicId && link.isActive,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "medico" ||
    !link.medicalIdentityVerified ||
    !link.grants.some((grant) => grant.resource === "journey_goals" && grant.action === "read")
  )
    throw new AuthError("Goal access denied", 403);
  const record = await read(context, id.data);
  if (!record) throw new AuthError("Goal access denied", 403);
  const goal = storedGoalSchema.parse(record.goal);
  if (
    goal.id !== id.data ||
    !isAuthorized(context, "journey_goals", "read", {
      ownerClinicId: goal.clinic_id,
      ownerPatientId: goal.patient_id,
      patientLink: record.patientLink,
    })
  )
    throw new AuthError("Goal access denied", 403);
  return journeyGoalViewSchema.parse({
    goalId: goal.id,
    clinicId: goal.clinic_id,
    patientId: goal.patient_id,
    title: titles[goal.kind],
    status: goal.status,
    version: goal.version,
  });
}
