import { isAuthSessionMissingError } from "@supabase/supabase-js";

/**
 * Controle de autorização do modo demonstrativo do PWA do cliente.
 * Garante que em ambientes de produção a ausência de sessão não ative automaticamente
 * previews demonstrativos com dados simulados ou contorne autenticação.
 */

export function isDemoModeAllowed(): boolean {
  // Em ambiente de testes (Vitest / Node.js)
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "test") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;

  // Desenvolvimento local
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname === "[::1]"
  ) {
    return true;
  }

  // Previews e ambientes explicitamente de teste
  if (
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".preview.local")
  ) {
    return true;
  }

  // Em produção (domínio real da clínica ou PlugPix), o modo demo é categoricamente desabilitado por omissão
  return false;
}

/**
 * Determina se o perfil demonstrativo pode ser ativado para o cliente.
 * 1. Se houver sessão autenticada real, NUNCA permite modo demo (retorna false).
 * 2. Se não houver sessão, só permite se o ambiente for expressamente autorizado (localhost / preview).
 * 3. Se o estado de sessão ainda for desconhecido (carregando), adota postura restritiva (false).
 */
export function shouldEnablePatientDemo(hasSession: boolean | null): boolean {
  if (hasSession === true) return false;
  if (hasSession === null) return false;
  return isDemoModeAllowed();
}

/** Failed Auth requests do not prove absence of a session. Keep unknown state restrictive. */
export function patientSessionPresence(user: unknown, error: unknown): boolean | null {
  if (error) return !user && isAuthSessionMissingError(error) ? false : null;
  return user ? true : false;
}
