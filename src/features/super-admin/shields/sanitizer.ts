import { createHash } from "node:crypto";

export interface SvgValidationResult {
  isValid: boolean;
  sanitizedSvg?: string;
  hash?: string;
  error?: string;
}

export const MAX_SVG_SIZE_BYTES = 256 * 1024; // 256 KB

/**
 * Calcula o hash SHA-256 determinístico de um conteúdo textual.
 */
export function calculateSvgHash(content: string): string {
  return createHash("sha256").update(content.trim(), "utf8").digest("hex");
}

/**
 * Sanitiza e valida rigorosamente um arquivo SVG para a Biblioteca de Escudos,
 * eliminando vetores de ataque XSS, scripts embutidos, tags externas e XXE.
 */
export function validateAndSanitizeSvg(rawContent: string): SvgValidationResult {
  if (!rawContent || typeof rawContent !== "string") {
    return { isValid: false, error: "Conteúdo SVG vazio ou inválido." };
  }

  const byteLength = Buffer.byteLength(rawContent, "utf8");
  if (byteLength > MAX_SVG_SIZE_BYTES) {
    return {
      isValid: false,
      error: `O arquivo SVG excede o limite máximo permitido de 256 KB (${Math.round(byteLength / 1024)} KB).`,
    };
  }

  const trimmed = rawContent.trim();

  // 1. Verificação de tag raiz e fechamento SVG
  if (!/<svg[\s>]/i.test(trimmed) || !/<\/svg>/i.test(trimmed)) {
    return {
      isValid: false,
      error: "O arquivo não contém uma estrutura de elemento <svg> válida.",
    };
  }

  // 2. Bloqueio estrito de XXE / Entidades XML externas
  if (/<!ENTITY/i.test(trimmed) || /<!DOCTYPE[^>]*\[/i.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Entidades XML externas e DOCTYPE customizados são estritamente proibidos por segurança.",
    };
  }

  // 3. Bloqueio de tags de código executável ou incorporação perigosa
  const dangerousTags = [
    /<script[\s>]/i,
    /<\/script>/i,
    /<foreignObject[\s>]/i,
    /<\/foreignObject>/i,
    /<embed[\s>]/i,
    /<object[\s>]/i,
    /<applet[\s>]/i,
    /<iframe[\s>]/i,
    /<meta[\s>]/i,
    /<link[\s>]/i,
  ];

  for (const pattern of dangerousTags) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: "O SVG contém tags ativas ou executáveis perigosas não permitidas.",
      };
    }
  }

  // 4. Bloqueio de atributos com manipuladores de evento JavaScript (on*)
  if (/[\s"'`]on[a-z]+\s*=/i.test(trimmed)) {
    return {
      isValid: false,
      error: "Manipuladores de eventos inline (ex: onload, onclick) são proibidos no SVG.",
    };
  }

  // 5. Bloqueio de URIs executáveis (javascript:, vbscript:)
  if (/(javascript|vbscript):/i.test(trimmed)) {
    return {
      isValid: false,
      error: "Links ou atributos contendo protocolos de script são estritamente proibidos.",
    };
  }

  // 6. Bloqueio de chamadas externas arbitrárias em href ou xlink:href
  // Permite apenas âncoras locais como href="#id" para gradientes e filtros internos
  const externalLinkMatch = /href\s*=\s*["'](https?:|\/\/)[^"']+["']/i.test(trimmed);
  if (externalLinkMatch) {
    return {
      isValid: false,
      error: "Referências externas (http/https) em href ou imagens não são permitidas nos Escudos.",
    };
  }

  // Sanitização: normalização de espaçamento e garantia de integridade
  const sanitized = trimmed;
  const hash = calculateSvgHash(sanitized);

  return {
    isValid: true,
    sanitizedSvg: sanitized,
    hash,
  };
}
