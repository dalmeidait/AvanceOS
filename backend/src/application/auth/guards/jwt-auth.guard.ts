import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { getAdminEmail, getDemoMasterToken } from '../../../config/env';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    const demoMasterToken = getDemoMasterToken();

    if (demoMasterToken && authHeader === `Bearer ${demoMasterToken}`) {
      const adminEmail = getAdminEmail();
      let admin = await this.prisma.usuario.findFirst({ where: { email: adminEmail } });

      if (!admin) {
        admin = {
          id: 'admin-master-id',
          email: adminEmail,
          nome: 'Administrador Master',
          cargo: 'ADMIN',
        } as any;
      }

      request.user = admin;
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return result;
    }
    return result as boolean;
  }
}
