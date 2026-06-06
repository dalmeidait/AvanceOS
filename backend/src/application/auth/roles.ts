import { Role } from '../../domain/enums';

export const ADMIN_ROLES = [Role.ADMIN, Role.ADMINISTRADOR] as const;

const roleAliases: Record<string, Role> = {
  ADMINISTRADOR: Role.ADMIN,
  DIRETOR: Role.ADMIN,
  GESTOR_FINANCEIRO: Role.FINANCEIRO,
  RECEPCIONISTA: Role.ATENDENTE,
  CONTADOR: Role.FINANCEIRO,
};

export function normalizeRole(role?: string | null): Role {
  const value = String(role || '').trim().toUpperCase();
  return roleAliases[value] || ((Object.values(Role).includes(value as Role) ? value : Role.ATENDENTE) as Role);
}

export function isAdminRole(role?: string | null) {
  return normalizeRole(role) === Role.ADMIN;
}

export function canAccessRole(userRole: string | null | undefined, allowedRoles: Role[]) {
  const normalizedUserRole = normalizeRole(userRole);
  if (normalizedUserRole === Role.ADMIN) return true;

  const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));
  return normalizedAllowed.includes(normalizedUserRole);
}
