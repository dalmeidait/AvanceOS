import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { auditStorage } from '../../audit/audit.storage';
import { getJwtSecret } from '../../../config/env';
import { normalizeRole } from '../roles';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    
    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!usuario.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (usuario.versaoToken !== payload.versaoToken) {
      throw new UnauthorizedException('Sessão revogada pelo Administrador (Kill Switch)');
    }

    const store = auditStorage.getStore();
    if (store) store.userId = payload.sub;

    return { id: payload.sub, email: payload.email, cargo: normalizeRole(payload.cargo || usuario.cargo) };
  }
}
