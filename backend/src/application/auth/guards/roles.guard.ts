import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../domain/enums';;
import { ROLES_KEY } from '../decorators/roles.decorator';
import { canAccessRole } from '../roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Se a rota não exigir perfil específico, permite o acesso
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Verifica se o perfil do usuário logado está na lista de perfis permitidos
    return canAccessRole(user?.cargo, requiredRoles);
  }
}
