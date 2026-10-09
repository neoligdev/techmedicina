import "@tanstack/react-start/server-only";
import {
  AuthenticatedIdentity,
  AuthContext,
  isAuthorized,
  ResourceType,
  Action,
  ResourceMetadata,
} from "./core";

/**
 * Resolvedor de sessão confiável (servidor).
 * Oculto da API pública do cliente.
 */
export async function getSession(): Promise<AuthenticatedIdentity | null> {
  // Simulação vazia para segurança
  return null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function throwUnauthorized(message: string): never {
  throw new AuthError(`401: Unauthorized - ${message}`, 401);
}

function throwForbidden(message: string): never {
  throw new AuthError(`403: Forbidden - ${message}`, 403);
}

// Fábrica injetável de guardas (para testes com dependências confiáveis)
export function createGuardFactory(
  sessionResolver: () => Promise<AuthenticatedIdentity | null>,
  resourceResolver: (
    resourceId: string,
    resourceType: ResourceType,
  ) => Promise<ResourceMetadata | undefined>,
) {
  const requireAuth = async (currentClinicId?: string): Promise<AuthContext> => {
    const session = await sessionResolver();
    if (!session) {
      throwUnauthorized("Missing session");
    }
    return {
      identity: session,
      currentClinicId,
    };
  };

  const requirePermission = async (
    resource: ResourceType,
    action: Action,
    currentClinicId?: string,
    resourceId?: string,
  ) => {
    const context = await requireAuth(currentClinicId);

    let metadata: ResourceMetadata | undefined;
    if (resourceId) {
      metadata = await resourceResolver(resourceId, resource);
    } else {
      // Se não há ID, o metadata pode precisar ser omitido ou apenas carregado o context global,
      // mas as regras de core vão negar se o recurso exigir metadados de clínica/paciente e ele não os tiver.
    }

    if (!isAuthorized(context, resource, action, metadata)) {
      throwForbidden(`Action '${action}' on resource '${resource}' denied`);
    }
    return context;
  };

  return { requireAuth, requirePermission };
}

// Resolvedor de recurso mockado para o default (na ausência de banco real configurado)
async function defaultResourceResolver(
  resourceId: string,
  resourceType: ResourceType,
): Promise<ResourceMetadata | undefined> {
  return undefined;
}

// Exportações reais usando os resolvedores locais
const defaultGuards = createGuardFactory(getSession, defaultResourceResolver);
export const requireAuth = defaultGuards.requireAuth;
export const requirePermission = defaultGuards.requirePermission;
