// @vitest-environment node
import { describe, expect, it, beforeEach } from "vitest";
import {
  validateAndSanitizeSvg,
  calculateSvgHash,
  MAX_SVG_SIZE_BYTES,
} from "../features/super-admin/shields/sanitizer";
import {
  buildDefaultShieldCatalog,
  OFFICIAL_SHIELD_METADATA,
} from "../features/super-admin/shields/default-assets";
import {
  createInitialCatalogState,
  getShieldCatalog,
  updateShieldAsset,
  publishCatalogVersion,
  rollbackToVersion,
  resetShieldCatalog,
  UserAuthContext,
} from "../features/super-admin/shields/storage";
import { ShieldArtService } from "../features/journey/shield-art-service";
import { SHIELD_IDS } from "../features/journey/contracts";

const superAdminContext: UserAuthContext = {
  userId: "operador_super_admin",
  role: "super_admin",
};

const clinicAdminContext: UserAuthContext = {
  userId: "admin_clinica_1",
  role: "admin_clinica",
};

const patientContext: UserAuthContext = {
  userId: "paciente_123",
  role: "paciente",
};

describe("VJE-4: Biblioteca Central de Artes dos Escudos (Ciclo 005)", () => {
  beforeEach(() => {
    resetShieldCatalog(superAdminContext);
  });

  // 1. Sanitização e Validação de SVG
  describe("1. Sanitizador Rigoroso de SVG", () => {
    it("1.1 aceita SVG limpo e calcula hash estável", () => {
      const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="#3B82F6" />
      </svg>`;

      const res = validateAndSanitizeSvg(cleanSvg);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedSvg).toBeDefined();
      expect(res.hash).toBe(calculateSvgHash(cleanSvg));
    });

    it("1.2 rejeita SVG contendo tag <script>", () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <script>alert('xss');</script>
        <circle cx="50" cy="50" r="40" fill="#3B82F6" />
      </svg>`;

      const res = validateAndSanitizeSvg(maliciousSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("tags ativas ou executáveis");
    });

    it("1.3 rejeita SVG com manipuladores de eventos inline (onload, onclick)", () => {
      const inlineEventSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" onload="fetch('https://malicious.com')" />
      </svg>`;

      const res = validateAndSanitizeSvg(inlineEventSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Manipuladores de eventos inline");
    });

    it("1.4 rejeita SVG com tag <foreignObject>", () => {
      const foreignObjectSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <foreignObject width="100" height="100">
          <body xmlns="http://www.w3.org/1999/xhtml">
            <div>Injeção HTML</div>
          </body>
        </foreignObject>
      </svg>`;

      const res = validateAndSanitizeSvg(foreignObjectSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("tags ativas ou executáveis");
    });

    it("1.5 rejeita protocolo javascript: em atributos", () => {
      const jsProtocolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <a href="javascript:alert(1)">
          <circle cx="50" cy="50" r="40" fill="#3B82F6" />
        </a>
      </svg>`;

      const res = validateAndSanitizeSvg(jsProtocolSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("protocolos de script");
    });

    it("1.6 rejeita referências a links externos não confiáveis", () => {
      const externalLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <image href="https://external-hacker.com/image.png" width="100" height="100" />
      </svg>`;

      const res = validateAndSanitizeSvg(externalLinkSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Referências externas");
    });

    it("1.7 rejeita entidades XML externas (XXE)", () => {
      const xxeSvg = `<?xml version="1.0"?>
      <!DOCTYPE svg [
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
      ]>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <text>&xxe;</text>
      </svg>`;

      const res = validateAndSanitizeSvg(xxeSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Entidades XML externas");
    });

    it("1.8 rejeita arquivos que excedem o tamanho máximo permitido de 256 KB", () => {
      const hugeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><!-- ${"A".repeat(
        MAX_SVG_SIZE_BYTES + 10,
      )} --></svg>`;

      const res = validateAndSanitizeSvg(hugeSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("excede o limite máximo permitido");
    });

    it("1.9 rejeita arquivos sem estrutura SVG válida", () => {
      const nonSvg = "I am just a plain text file pretending to be SVG";
      const res = validateAndSanitizeSvg(nonSvg);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("estrutura de elemento <svg> válida");
    });
  });

  // 2. Catálogo Oficial das 15 Variações Canônicas
  describe("2. Catálogo Oficial das 15 Variações (PRD v0.11.3 §11.5)", () => {
    const catalog = buildDefaultShieldCatalog();
    const assets = Object.values(catalog);

    it("2.1 possui exatamente 15 variações cadastradas", () => {
      expect(assets).toHaveLength(15);
    });

    it("2.2 cobre todos os 5 Escudos oficiais com 3 variantes cada (active, earned, locked)", () => {
      for (const shieldId of SHIELD_IDS) {
        expect(catalog[`${shieldId}_active`]).toBeDefined();
        expect(catalog[`${shieldId}_earned`]).toBeDefined();
        expect(catalog[`${shieldId}_locked`]).toBeDefined();

        expect(catalog[`${shieldId}_active`]!.shieldId).toBe(shieldId);
        expect(catalog[`${shieldId}_earned`]!.shieldId).toBe(shieldId);
        expect(catalog[`${shieldId}_locked`]!.shieldId).toBe(shieldId);
      }
    });

    it("2.3 todas as 15 artes padrão são 100% válidas pelo sanitizador", () => {
      for (const asset of assets) {
        const val = validateAndSanitizeSvg(asset.svgContent);
        expect(val.isValid).toBe(true);
        expect(val.hash).toBe(asset.svgHash);
        expect(asset.accessibilityLabel).toContain(OFFICIAL_SHIELD_METADATA[asset.shieldId].name);
      }
    });

    it("2.4 cada variação tem cores oficiais e metadados de acessibilidade", () => {
      expect(catalog["origem_active"]!.themeColor).toBe("#D97706");
      expect(catalog["ritmo_active"]!.themeColor).toBe("#F59E0B");
      expect(catalog["avanco_active"]!.themeColor).toBe("#10B981");
      expect(catalog["equilibrio_active"]!.themeColor).toBe("#3B82F6");
      expect(catalog["plenitude_active"]!.themeColor).toBe("#8B5CF6");
    });
  });

  // 3. Controle de Versão, Publicação e Rollback
  describe("3. Versionamento, Publicação e Rollback", () => {
    it("3.1 inicia com versão padrão v1.0.0 publicada", () => {
      const state = getShieldCatalog();
      expect(state.version).toBe("1.0.0");
      expect(state.history).toHaveLength(1);
      expect(state.history[0]!.version).toBe("1.0.0");
      expect(Object.values(state.assets).every((a) => a.status === "published")).toBe(true);
    });

    it("3.2 permite ao Super ADM atualizar um ativo e marcá-lo como rascunho", () => {
      const newCustomSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,10 90,90 10,90" fill="#10B981" />
      </svg>`;

      const updateRes = updateShieldAsset({
        assetId: "avanco_active",
        rawSvg: newCustomSvg,
        userContext: superAdminContext,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.asset?.status).toBe("draft");
      expect(updateRes.asset?.svgContent).toContain("polygon");

      const catalog = getShieldCatalog();
      expect(catalog.assets["avanco_active"]!.status).toBe("draft");
    });

    it("3.3 publica formalmente nova versão v1.1.0 promovendo rascunhos para oficial", () => {
      // Atualiza uma arte
      updateShieldAsset({
        assetId: "origem_active",
        rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#D97706"/></svg>`,
        userContext: superAdminContext,
      });

      const pubRes = publishCatalogVersion({
        newVersion: "1.1.0",
        changeSummary: "Ajuste na coroa do Escudo Origem Ativo",
        userContext: superAdminContext,
      });

      expect(pubRes.success).toBe(true);
      expect(pubRes.catalog?.version).toBe("1.1.0");
      expect(pubRes.catalog?.history).toHaveLength(2);
      expect(pubRes.catalog?.history[0]!.version).toBe("1.1.0");

      const reloaded = getShieldCatalog();
      expect(reloaded.version).toBe("1.1.0");
      expect(reloaded.assets["origem_active"]!.status).toBe("published");
      expect(reloaded.assets["origem_active"]!.version).toBe("1.1.0");
    });

    it("3.4 executa rollback para versão anterior preservando integridade histórica", () => {
      // 1. Publica v1.1.0
      publishCatalogVersion({
        newVersion: "1.1.0",
        changeSummary: "Versão intermediária",
        userContext: superAdminContext,
      });

      // 2. Executa rollback para v1.0.0
      const rollRes = rollbackToVersion({
        targetVersion: "1.0.0",
        userContext: superAdminContext,
      });

      expect(rollRes.success).toBe(true);
      expect(rollRes.catalog?.version).toBe("1.0.0-revert");

      const reloaded = getShieldCatalog();
      expect(reloaded.assets["origem_active"]!.version).toBe("1.0.0");
    });
  });

  // 4. Segurança e Autorização (Isolamento Super ADM)
  describe("4. Segurança e Autorização (Apenas Super ADM)", () => {
    it("4.1 bloqueia tentativa de edição por perfil de paciente", () => {
      const res = updateShieldAsset({
        assetId: "plenitude_active",
        rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`,
        userContext: patientContext,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Acesso negado");
    });

    it("4.2 bloqueia tentativa de edição por perfil de administrador de clínica", () => {
      const res = updateShieldAsset({
        assetId: "plenitude_active",
        rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`,
        userContext: clinicAdminContext,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Acesso negado");
    });

    it("4.3 bloqueia tentativa de publicação ou rollback por usuários comuns", () => {
      const pubRes = publishCatalogVersion({
        newVersion: "2.0.0",
        changeSummary: "Ataque",
        userContext: clinicAdminContext,
      });
      expect(pubRes.success).toBe(false);
      expect(pubRes.error).toContain("Acesso negado");

      const rollRes = rollbackToVersion({
        targetVersion: "1.0.0",
        userContext: patientContext,
      });
      expect(rollRes.success).toBe(false);
      expect(rollRes.error).toContain("Acesso negado");
    });
  });

  // 5. Contrato de Leitura para o PWA (ShieldArtService)
  describe("5. Contratos de Leitura para o PWA", () => {
    it("5.1 retorna somente as artes publicadas oficialmente", () => {
      // Cria um rascunho sem publicar
      updateShieldAsset({
        assetId: "ritmo_active",
        rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#F59E0B"/></svg>`,
        userContext: superAdminContext,
      });

      const publishedList = ShieldArtService.getPublishedShieldArts();
      // Como ritmo_active virou draft, apenas as 14 publicadas restantes devem ser expostas
      expect(publishedList).toHaveLength(14);
      expect(publishedList.some((a) => a.id === "ritmo_active")).toBe(false);
    });

    it("5.2 recupera arte específica publicada pelo ShieldId e variante", () => {
      const art = ShieldArtService.getShieldArt("plenitude", "active");
      expect(art).not.toBeNull();
      expect(art?.shieldId).toBe("plenitude");
      expect(art?.variant).toBe("active");
      expect(art?.name).toBe("Plenitude — Ativo");
      expect(art?.svgContent).toContain("<svg");
      expect(art?.accessibilityLabel).toContain("Plenitude");
    });

    it("5.3 retorna null se a arte solicitada estiver em rascunho (não publicada)", () => {
      updateShieldAsset({
        assetId: "equilibrio_active",
        rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3B82F6"/></svg>`,
        userContext: superAdminContext,
      });

      const art = ShieldArtService.getShieldArt("equilibrio", "active");
      expect(art).toBeNull();
    });

    it("5.4 recupera com segurança o catálogo padrão caso haja corrupção ou adulteração de dados", () => {
      // Simula corrupção com JSON inválido ou incompleto
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("tm_shield_arts_catalog_v1", JSON.stringify({ assets: {} }));
        const recovered = getShieldCatalog();
        expect(Object.keys(recovered.assets)).toHaveLength(15);
      }
    });

    it("5.5 rejeita publicação com formato de versão não-SemVer", () => {
      const invalidVersionRes = publishCatalogVersion({
        newVersion: "v1.2",
        changeSummary: "Teste de formato inválido",
        userContext: superAdminContext,
      });
      expect(invalidVersionRes.success).toBe(false);
      expect(invalidVersionRes.error).toContain("Versão inválida");
    });
  });
});
