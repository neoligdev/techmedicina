export type Role = "super_admin" | "admin" | "medico" | "paciente";

export type ResourceType =
  "cadastro_clinica" | "prontuario" | "paciente" | "agenda" | "faturamento";
export type Action = "create" | "read" | "write" | "delete" | "manage";

export interface Permission {
  resource: ResourceType;
  action: Action;
}

export interface PatientLinkMeta {
  patientId: string;
  clinicId: string;
  isActive: boolean;
}

export interface ResourceMetadata {
  ownerClinicId?: string;
  ownerPatientId?: string;
  isDraft?: boolean;
  patientLink?: PatientLinkMeta; // Vínculo do paciente proprietário do recurso
}

export interface ClinicLink {
  clinicId: string;
  role: Role;
  isActive: boolean;
  grants: Permission[];
  patientId?: string;
  medicalIdentityVerified?: boolean;
}

export interface AuthenticatedIdentity {
  userId: string;
  globalRole?: Role; // "super_admin"
  links: ClinicLink[];
}

export interface AuthContext {
  identity: AuthenticatedIdentity;
  currentClinicId?: string | undefined;
}

/**
 * Avalia se o contexto de usuário tem direito ao recurso/ação solicitados.
 */
export function isAuthorized(
  context: AuthContext,
  resource: ResourceType,
  action: Action,
  metadata?: ResourceMetadata,
): boolean {
  if (!context.identity) return false;

  // 0. Allowlists Globais (Zero Trust em runtime contra unknown casts)
  const validResources = ["cadastro_clinica", "prontuario", "paciente", "agenda", "faturamento"];
  const validActions = ["create", "read", "write", "delete", "manage"];
  if (!validResources.includes(resource) || !validActions.includes(action)) {
    return false;
  }

  // 1. Regra de Segurança Base (Zero Trust): Prontuário definitivo NUNCA pode ser editado/apagado
  if (resource === "prontuario" && (action === "write" || action === "delete")) {
    if (!metadata?.isDraft) {
      return false;
    }
  }

  // 2. Escopo Global: Super ADM
  if (context.identity.globalRole === "super_admin") {
    // Super ADM tem acesso irrestrito ao cadastro global (sem dono específico ou seu próprio ID)
    if (
      resource === "cadastro_clinica" &&
      (action === "manage" ||
        action === "read" ||
        action === "create" ||
        action === "write" ||
        action === "delete")
    ) {
      return true;
    }
    // Negado a qualquer outro dado sensível clínico
    if (!context.currentClinicId) {
      return false;
    }
  }

  // A partir daqui exige contexto de clínica
  if (!context.currentClinicId) return false;

  // 3. Validação de Vínculo na Clínica de Contexto
  const currentLink = context.identity.links.find(
    (link) => link.clinicId === context.currentClinicId,
  );

  if (!currentLink || !currentLink.isActive) {
    return false;
  }

  // 4. Se o recurso não é global, precisa de ownerClinicId (inclusive admin gerenciando cadastro)
  if (!metadata?.ownerClinicId || metadata.ownerClinicId !== context.currentClinicId) {
    return false;
  }

  // 5. Invariantes Rígidas de Papel em Runtime (allowlists)
  const role = currentLink.role;
  // Na clínica, super_admin não é um papel de vínculo válido, apenas admin, medico, paciente
  const validRoles = ["admin", "medico", "paciente"];
  if (!validRoles.includes(role)) return false;

  // Prontuário: REGRA DE OURO - independente do papel, SÓ médico verificado pode acessar/criar/modificar
  if (resource === "prontuario") {
    if (role !== "medico" || currentLink.medicalIdentityVerified !== true) {
      return false;
    }
  }

  // Médico: só pode atuar em agenda, paciente, prontuario
  if (role === "medico") {
    if (!["agenda", "paciente", "prontuario"].includes(resource)) return false;
  }

  // Paciente: só pode atuar em agenda (read/create)
  if (role === "paciente") {
    if (resource !== "agenda" || !["read", "create"].includes(action)) return false;
  }

  // Admin: não pode atuar em prontuario
  if (role === "admin") {
    if (resource === "prontuario") return false;
  }

  // 6. Verificar grants EXPLÍCITOS no vínculo
  const hasGrant = currentLink.grants.some((g) => g.resource === resource && g.action === action);
  if (!hasGrant) return false;

  // 7. Regras Específicas de Conteúdo Clínico (agenda, paciente, prontuario)
  if (resource === "agenda" || resource === "paciente" || resource === "prontuario") {
    // Exige ownerPatientId preenchido
    if (!metadata?.ownerPatientId) return false;

    // Exige vínculo ativo do paciente proprietário
    if (
      !metadata?.patientLink ||
      !metadata.patientLink.isActive ||
      metadata.patientLink.clinicId !== context.currentClinicId ||
      !metadata.patientLink.patientId ||
      metadata.patientLink.patientId !== metadata.ownerPatientId
    ) {
      return false;
    }

    // Regra específica de Médico: exige identidade verificada para qualquer outro dado clínico
    if (role === "medico") {
      if (currentLink.medicalIdentityVerified !== true) {
        return false;
      }
    }

    // Regras de Paciente
    if (role === "paciente") {
      // Usa o patientId do vínculo, NUNCA identity.userId
      if (!currentLink.patientId || currentLink.patientId !== metadata.ownerPatientId) {
        return false;
      }
    }
  }

  return true;
}
