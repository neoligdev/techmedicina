import { expect, it } from "vitest";
import { suggestedWhiteLabelHosts } from "../features/auth/white-label-hostnames";
import { RESERVED_HOST_NAMES } from "../lib/white-label/host-resolver";
it("separa central, clínica/médico e PWA na convenção proposta", () => {
  expect(suggestedWhiteLabelHosts("viva-saude")).toEqual({
    central: "admin.techmedicina.com.br",
    clinic_portal: "viva-saude.techmedicina.com.br",
    patient_pwa: "app.viva-saude.techmedicina.com.br",
  });
});
it("recusa nomes reservados, caminhos e labels inválidos", () => {
  for (const slug of [...RESERVED_HOST_NAMES, "", "Viva", "a.b", "-a", "a-", "a/b", "a".repeat(64)])
    expect(suggestedWhiteLabelHosts(slug), slug).toBeNull();
});
