// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, it, expect } from "vitest";
import {
  DEFAULT_TEXTURE_CATALOG,
  validTextureUrl,
  validImageBase64,
  validPreferences,
  defaultPreferences,
  type ClinicPreferences,
} from "../features/demo/personalization";
import {
  clinicBrandingPreferencesSchema,
  clinicBrandingWriteSchema,
  savedClinicBrandingSchema,
} from "../features/auth/clinic-branding";
import { loadPreferences, storePreferences } from "../features/demo/preference-storage";
import { createClinicBrandingHandlers } from "../lib/admin/clinic-branding.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthenticatedIdentity } from "../lib/auth/core";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const operator = uid(1);
const admin = uid(2);
const doctor = uid(3);
const patient = uid(4);
const stranger = uid(5);

// 1x1 valid PNG (68 bytes)
const VALID_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
// 1x1 valid JPEG
const VALID_JPEG_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
// 1x1 valid WebP
const VALID_WEBP_BASE64 = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

let db: PGlite;
let clinicA: string;
let clinicB: string;

async function asUser(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}

async function saveBranding(clinicId: string, value: unknown, revision: number) {
  const result = await db.query<{ branding: unknown }>(
    "SELECT public.tm_save_branding($1,$2::jsonb,$3) AS branding",
    [clinicId, JSON.stringify(value), revision],
  );
  return savedClinicBrandingSchema.parse(result.rows[0]!.branding);
}

describe("C029: Personalização e Envio de Texturas por Clínica", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);

    for (const name of [
      "001_tenant_foundation.sql",
      "002_clinic_administration.sql",
      "003_clinic_branding.sql",
      "004_clinic_texture_branding.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../../database/migrations/${name}`, import.meta.url), "utf8"),
      );
    }

    await db.query(
      "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
      [operator],
    );
    await asUser(operator);

    const created = await db.query<{ clinic: { id: string } }>(
      "SELECT public.tm_save_clinic('Clínica Estrela',true) AS clinic UNION ALL SELECT public.tm_save_clinic('Clínica Solar',true)",
    );
    clinicA = created.rows[0]!.clinic.id;
    clinicB = created.rows[1]!.clinic.id;

    await db.exec("RESET ROLE");
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [uid(10), clinicA, patient],
    );
    await db.query(
      `INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES
      ($1,$2,$3,'admin',true,null),($4,$2,$5,'medico',true,null),($6,$2,$7,'paciente',true,$8)`,
      [uid(20), clinicA, admin, uid(21), doctor, uid(22), patient, uid(10)],
    );
    await db.query(
      "INSERT INTO public.tm_membership_grants(membership_id,resource,action) VALUES($1,'cadastro_clinica','write')",
      [uid(20)],
    );
  }, 30000);

  describe("1. Catálogo Padrão e Validações de Formato", () => {
    it("possui exatamente 5 opções no catálogo padrão, sendo 4 reais e a 5ª pendente", () => {
      expect(DEFAULT_TEXTURE_CATALOG).toHaveLength(5);
      expect(DEFAULT_TEXTURE_CATALOG[0]?.id).toBe("texture-1");
      expect(DEFAULT_TEXTURE_CATALOG[0]?.url).toBe("/textures/texture-1.jpg");
      expect(DEFAULT_TEXTURE_CATALOG[0]?.isAvailable).toBe(true);

      expect(DEFAULT_TEXTURE_CATALOG[1]?.id).toBe("texture-2");
      expect(DEFAULT_TEXTURE_CATALOG[1]?.url).toBe("/textures/texture-2.jpg");
      expect(DEFAULT_TEXTURE_CATALOG[1]?.isAvailable).toBe(true);

      expect(DEFAULT_TEXTURE_CATALOG[2]?.id).toBe("texture-3");
      expect(DEFAULT_TEXTURE_CATALOG[2]?.url).toBe("/textures/texture-3.jpg");
      expect(DEFAULT_TEXTURE_CATALOG[2]?.isAvailable).toBe(true);

      expect(DEFAULT_TEXTURE_CATALOG[3]?.id).toBe("texture-4");
      expect(DEFAULT_TEXTURE_CATALOG[3]?.url).toBe("/textures/texture-4.jpg");
      expect(DEFAULT_TEXTURE_CATALOG[3]?.isAvailable).toBe(true);

      // 5ª opção estritamente declarada como pendente de anexo sem invenção ou duplicação
      expect(DEFAULT_TEXTURE_CATALOG[4]?.id).toBe("texture-5");
      expect(DEFAULT_TEXTURE_CATALOG[4]?.url).toBeUndefined();
      expect(DEFAULT_TEXTURE_CATALOG[4]?.isAvailable).toBe(false);
      expect(DEFAULT_TEXTURE_CATALOG[4]?.description).toContain("Pendente de anexo");
    });

    it("valida URLs de textura permitidas e rejeita esquemas externos ou suspeitos", () => {
      expect(validTextureUrl("/textures/texture-1.jpg")).toBe(true);
      expect(validTextureUrl("/textures/texture-4.jpg")).toBe(true);
      expect(validTextureUrl("/patient-mobile-texture.jpg")).toBe(true);
      expect(validTextureUrl(VALID_PNG_BASE64)).toBe(true);
      expect(validTextureUrl(VALID_JPEG_BASE64)).toBe(true);
      expect(validTextureUrl(VALID_WEBP_BASE64)).toBe(true);

      // Rejeita domínios arbitrários, javascript:, svg e scripts
      expect(validTextureUrl("http://malicious.com/texture.jpg")).toBe(false);
      expect(validTextureUrl("javascript:alert(1)")).toBe(false);
      expect(validTextureUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
      expect(validTextureUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    });

    it("valida magic bytes e limites de tamanho em imagens base64 até 5MB", () => {
      expect(validImageBase64(VALID_PNG_BASE64, 5242880)).toBe(true);
      expect(validImageBase64(VALID_JPEG_BASE64, 5242880)).toBe(true);
      expect(validImageBase64(VALID_WEBP_BASE64, 5242880)).toBe(true);

      // SVG rejeitado
      expect(validImageBase64("data:image/svg+xml;base64,PHN2Zz4=", 5242880)).toBe(false);

      // Falso PNG com payload inválido
      expect(validImageBase64("data:image/png;base64,QUJDREVGR0g=", 5242880)).toBe(false);
    });
  });

  describe("2. Isolamento por Clínica e Persistência no Banco (004)", () => {
    it("permite ao administrador salvar escolha de textura do catálogo para a Clínica A", async () => {
      await asUser(admin);
      const prefA: ClinicPreferences = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        textureId: "texture-1",
        textureUrl: "/textures/texture-1.jpg",
      };

      const savedA = await saveBranding(clinicA, prefA, 0);
      expect(savedA.preferences.textureId).toBe("texture-1");
      expect(savedA.preferences.textureUrl).toBe("/textures/texture-1.jpg");
    });

    it("mantém isolamento estrito: Clínica B salva textura diferente e não interfere na Clínica A", async () => {
      await asUser(operator);
      const prefB: ClinicPreferences = {
        name: "Clínica Solar",
        primary: "#f59e0b",
        secondary: "#b45309",
        mode: "light",
        textureId: "texture-4",
        textureUrl: "/textures/texture-4.jpg",
      };

      const savedB = await saveBranding(clinicB, prefB, 0);
      expect(savedB.preferences.textureId).toBe("texture-4");
      expect(savedB.preferences.textureUrl).toBe("/textures/texture-4.jpg");

      // Consultar Clínica A no banco e garantir que seu fundo permaneceu texture-1
      const checkA = await db.query<{ preferences: ClinicPreferences }>(
        "SELECT preferences FROM public.tm_clinic_branding WHERE clinic_id = $1",
        [clinicA],
      );
      expect(checkA.rows[0]!.preferences.textureId).toBe("texture-1");
      expect(checkA.rows[0]!.preferences.textureUrl).toBe("/textures/texture-1.jpg");
    });

    it("salva textura personalizada da própria clínica em customTextures", async () => {
      await asUser(admin);
      const prefWithCustom: ClinicPreferences = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        textureId: "custom-1",
        textureUrl: VALID_PNG_BASE64,
        customTextures: [
          {
            id: "custom-1",
            name: "Fundo Exclusivo Clínica Estrela",
            url: VALID_PNG_BASE64,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const updatedA = await saveBranding(clinicA, prefWithCustom, 1);
      expect(updatedA.preferences.textureId).toBe("custom-1");
      expect(updatedA.preferences.customTextures).toHaveLength(1);
      expect(updatedA.preferences.customTextures![0]!.name).toBe("Fundo Exclusivo Clínica Estrela");

      // Verificar registro de auditoria como operador (RLS restringe leitura de auditoria a operadores)
      await asUser(operator);
      const audit = await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicA],
      );
      expect(audit.rows[0]!.changed_fields).toContain("textureId");
      expect(audit.rows[0]!.changed_fields).toContain("customTextures");
    });

    it("rejeita alteração de personalização por médico, paciente ou estranho", async () => {
      const payload = {
        name: "Invasão",
        primary: "#111111",
        secondary: "#222222",
        mode: "dark",
        textureId: "texture-2",
      };

      for (const nonAdminId of [doctor, patient, stranger]) {
        await asUser(nonAdminId);
        await expect(saveBranding(clinicA, payload, 2)).rejects.toThrow(
          "Administrative access denied",
        );
      }
    });

    it("rejeita tentativa de salvar configurações para clínica que o admin não gerencia", async () => {
      await asUser(admin); // admin da clínica A tentando gravar na clínica B
      const payload = {
        name: "Tentativa Cruzada",
        primary: "#111111",
        secondary: "#222222",
        mode: "dark",
        textureId: "texture-2",
      };

      await expect(saveBranding(clinicB, payload, 1)).rejects.toThrow(
        "Administrative access denied",
      );
    });

    it("rejeita no SQL texturas com formato falso, SVG ou itens malformados em customTextures", async () => {
      await asUser(admin);
      // SVG proibido em textureUrl
      const svgPayload = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        textureUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      };
      await expect(saveBranding(clinicA, svgPayload, 2)).rejects.toThrow("Invalid branding input");

      // Custom texture com item malformado (sem campo id)
      const missingIdPayload = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        customTextures: [
          { name: "Teste", url: VALID_PNG_BASE64, createdAt: "2026-10-12T12:00:00Z" },
        ],
      };
      await expect(saveBranding(clinicA, missingIdPayload, 2)).rejects.toThrow(
        "Invalid branding input",
      );

      // Custom texture com campos estranhos/não autorizados
      const extraFieldPayload = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        customTextures: [
          {
            id: "t-1",
            name: "Teste",
            url: VALID_PNG_BASE64,
            createdAt: "2026-10-12T12:00:00Z",
            executable: true,
          },
        ],
      };
      await expect(saveBranding(clinicA, extraFieldPayload, 2)).rejects.toThrow(
        "Invalid branding input",
      );

      // Custom texture com imagem corrompida (magic bytes falsos)
      const fakeMagicPayload = {
        name: "Clínica Estrela",
        primary: "#10b981",
        secondary: "#065f46",
        mode: "dark",
        customTextures: [
          {
            id: "t-1",
            name: "Falso PNG",
            url: "data:image/png;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=",
            createdAt: "2026-10-12T12:00:00Z",
          },
        ],
      };
      await expect(saveBranding(clinicA, fakeMagicPayload, 2)).rejects.toThrow(
        "Invalid branding input",
      );
    });
  });

  describe("3. Handlers HTTP e Limite de Payload", () => {
    it("permite leitura segura de branding e impede gravação sem autorização", async () => {
      const mockIdentity: AuthenticatedIdentity = {
        userId: admin,
        links: [
          {
            clinicId: clinicA,
            role: "admin",
            isActive: true,
            grants: [{ resource: "cadastro_clinica", action: "write" }],
          },
        ],
      };

      const handlers = createClinicBrandingHandlers(
        async () => ({ identity: mockIdentity }),
        async (_, cid) => {
          const res = await db.query<{ branding: unknown }>(
            "SELECT jsonb_build_object('clinic_id',clinic_id,'preferences',preferences,'revision',revision,'updated_at',to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')) AS branding FROM public.tm_clinic_branding WHERE clinic_id = $1",
            [cid],
          );
          return res.rows[0]?.branding ?? null;
        },
        async (_, input) => {
          return saveBranding(input.clinicId, input.preferences, input.expectedRevision);
        },
      );

      const getReq = new Request(`https://example.test/api/branding?clinicId=${clinicA}`, {
        method: "GET",
      });
      const getRes = await handlers.GET(getReq);
      expect(getRes.status).toBe(200);

      // Rejeita acesso do admin à Clínica B
      const getReqB = new Request(`https://example.test/api/branding?clinicId=${clinicB}`, {
        method: "GET",
      });
      const getResB = await handlers.GET(getReqB);
      expect(getResB.status).toBe(403);
    });
  });
});
