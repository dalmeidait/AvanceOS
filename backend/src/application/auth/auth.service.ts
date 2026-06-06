import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma.service';
import * as bcrypt from 'bcrypt';
// @ts-ignore
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { AuditService } from '../audit/audit.service';
import { normalizeRole } from './roles';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  private validatePasswordPolicy(password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('A nova senha deve conter letra maiuscula, letra minuscula, numero e caractere especial.');
    }
  }

  private buildLoginResponse(usuario: any, normalizedRole: string) {
    const requirePasswordChange = Boolean(usuario.requirePasswordChange);
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      cargo: normalizedRole,
      versaoToken: usuario.versaoToken,
      requirePasswordChange,
    };

    return {
      access_token: this.jwtService.sign(payload),
      requirePasswordChange,
      requirePasswordReset: requirePasswordChange,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: normalizedRole,
        requirePasswordChange,
      },
    };
  }

  async login(email: string, senha: string, mfaCode?: string, context?: { ipAddress?: string; userAgent?: string }) {
    try {
      const usuario = await this.prisma.usuario.findUnique({ where: { email } });

      if (!usuario) {
        await this.auditService.logAction({
          action: 'LOGIN_FAILED',
          entity: 'AUTH',
          description: `Falha de login para e-mail inexistente: ${email}`,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          metadata: { email },
        });
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const normalizedRole = normalizeRole(usuario.cargo);
      const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
      if (!senhaValida) {
        await this.auditService.logAction({
          userId: usuario.id,
          userName: usuario.nome,
          userEmail: usuario.email,
          userRole: normalizedRole,
          action: 'LOGIN_FAILED',
          entity: 'AUTH',
          entityId: usuario.id,
          description: 'Falha de login por senha inválida.',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (!usuario.isActive) {
        throw new UnauthorizedException('Usuário inativo.');
      }

      if (['ADMIN', 'FINANCEIRO'].includes(normalizedRole) && usuario.mfaAtivo) {
        if (!mfaCode) {
          throw new UnauthorizedException('Código de autenticação (2FA) é obrigatório para este cargo.');
        }
        const isMfaValid = authenticator.verify({ token: mfaCode, secret: usuario.mfaSecret! });
        if (!isMfaValid) {
          throw new UnauthorizedException('Código 2FA inválido');
        }
      }

      await this.auditService.logAction({
        userId: usuario.id,
        userName: usuario.nome,
        userEmail: usuario.email,
        userRole: normalizedRole,
        action: 'LOGIN_SUCCESS',
        entity: 'AUTH',
        entityId: usuario.id,
        description: 'Login realizado com sucesso.',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      if (usuario.requirePasswordChange) {
        await this.auditService.logAction({
          userId: usuario.id,
          userName: usuario.nome,
          userEmail: usuario.email,
          userRole: normalizedRole,
          action: 'PASSWORD_CHANGE_REQUIRED',
          entity: 'AUTH',
          entityId: usuario.id,
          description: 'Usuário deve alterar a senha provisória antes de continuar.',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }

      return this.buildLoginResponse(usuario, normalizedRole);
    } catch (e: any) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.error('Falha inesperada no login', e?.stack || e?.message || e);
      throw new UnauthorizedException('Credenciais inválidas');
    }
  }

  async generateMfaSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'AvanceOS App', secret);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      qrCodeUrl: await qrcode.toDataURL(otpauthUrl),
    };
  }

  async turnOnMfa(userId: string, mfaCode: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario?.mfaSecret) throw new UnauthorizedException('MFA não configurado');

    const isCodeValid = authenticator.verify({
      token: mfaCode,
      secret: usuario.mfaSecret,
    });

    if (!isCodeValid) throw new UnauthorizedException('Código 2FA inválido');

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { mfaAtivo: true },
    });

    return { message: 'Autenticação de dois fatores (2FA) ativada com sucesso.' };
  }

  async alterarSenha(email: string, senhaAtual: string, novaSenha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }
    this.validatePasswordPolicy(novaSenha);
    const novaSenhaIgual = await bcrypt.compare(novaSenha, usuario.senhaHash);
    if (novaSenhaIgual) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    const hashedNovaSenha = await bcrypt.hash(novaSenha, 10);

    await this.prisma.usuario.update({
      where: { email },
      data: { senhaHash: hashedNovaSenha, versaoToken: 1, requirePasswordChange: false },
    });

    return { message: 'Senha atualizada com sucesso.' };
  }

  async changePassword(userId: string, senhaAtual: string, novaSenha: string, confirmarNovaSenha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.');

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaValida) throw new BadRequestException('Senha atual inválida.');
    if (novaSenha !== confirmarNovaSenha) {
      throw new BadRequestException('A confirmação da nova senha não confere.');
    }

    this.validatePasswordPolicy(novaSenha);
    const novaSenhaIgual = await bcrypt.compare(novaSenha, usuario.senhaHash);
    if (novaSenhaIgual) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    const updated = await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        senhaHash: await bcrypt.hash(novaSenha, 10),
        requirePasswordChange: false,
      },
    });
    const normalizedRole = normalizeRole(updated.cargo);

    await this.auditService.logAction({
      userId: updated.id,
      userName: updated.nome,
      userEmail: updated.email,
      userRole: normalizedRole,
      action: 'PASSWORD_CHANGED',
      entity: 'USUARIO',
      entityId: updated.id,
      description: 'Usuário alterou a própria senha.',
    });

    return {
      message: 'Senha alterada com sucesso.',
      ...this.buildLoginResponse(updated, normalizedRole),
    };
  }
}
