import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../../domain/enums';
import { AuditService } from '../audit/audit.service';
import { normalizeRole } from '../auth/roles';

type UserActor = { id?: string; nome?: string; email?: string; cargo?: string };

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private readonly userSelect = {
    id: true,
    nome: true,
    email: true,
    cargo: true,
    isActive: true,
    requirePasswordChange: true,
    mfaAtivo: true,
    versaoToken: true,
    criadoEm: true,
    atualizadoEm: true,
  };

  private normalizePayloadRole(value?: string) {
    const role = normalizeRole(value || Role.ATENDENTE);
    const allowed = [Role.ADMIN, Role.GERENTE, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO, Role.ESTOQUE];
    if (!allowed.includes(role)) throw new BadRequestException('Função de usuário inválida.');
    return role;
  }

  private mapUsuario(usuario: any) {
    return {
      ...usuario,
      cargo: normalizeRole(usuario.cargo),
      role: normalizeRole(usuario.cargo),
      isActive: Boolean(usuario.isActive),
      status: usuario.isActive ? 'ATIVO' : 'INATIVO',
      createdAt: usuario.criadoEm,
      updatedAt: usuario.atualizadoEm,
    };
  }

  async create(data: any, actor?: UserActor) {
    if (!data.email || data.email.trim() === '') {
      throw new BadRequestException('E-mail e obrigatorio.');
    }
    if (!data.nome || data.nome.trim() === '') {
      throw new BadRequestException('Nome e obrigatorio.');
    }

    const email = String(data.email).trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({ where: { email } });
    if (existente) throw new ConflictException('E-mail ja cadastrado.');

    const senhaInicial = data.senha || data.temporaryPassword || process.env.DEFAULT_USER_PASSWORD;
    if (!senhaInicial) throw new BadRequestException('Senha inicial obrigatória.');

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: String(data.nome).trim(),
        email,
        senhaHash: await bcrypt.hash(senhaInicial, 10),
        cargo: this.normalizePayloadRole(data.cargo || data.perfil || data.role),
        isActive: data.isActive ?? data.status !== 'INATIVO',
        requirePasswordChange: true,
      },
      select: this.userSelect,
    });

    await this.auditService.logAction({
      userId: actor?.id,
      action: 'USER_CREATED',
      entity: 'USUARIO',
      entityId: usuario.id,
      description: `Usuário criado: ${usuario.email}`,
      metadata: { targetUser: this.mapUsuario(usuario) },
    });

    return this.mapUsuario(usuario);
  }

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      select: this.userSelect,
      orderBy: [{ isActive: 'desc' }, { nome: 'asc' }],
    });
    return usuarios.map((usuario) => this.mapUsuario(usuario));
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: this.userSelect });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return this.mapUsuario(usuario);
  }

  async update(id: string, data: any, actor?: UserActor) {
    await this.findOne(id);
    const updateData: any = {};

    if (data.nome !== undefined) updateData.nome = String(data.nome).trim();
    if (data.email !== undefined) updateData.email = String(data.email).trim().toLowerCase();
    if (data.cargo !== undefined || data.perfil !== undefined || data.role !== undefined) {
      updateData.cargo = this.normalizePayloadRole(data.cargo || data.perfil || data.role);
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.status !== undefined) updateData.isActive = data.status === 'ATIVO';
    if (data.senha || data.temporaryPassword) {
      updateData.senhaHash = await bcrypt.hash(data.senha || data.temporaryPassword, 10);
      updateData.requirePasswordChange = true;
      updateData.versaoToken = { increment: 1 };
    }

    const usuario = await this.prisma.usuario.update({ where: { id }, data: updateData, select: this.userSelect });

    await this.auditService.logAction({
      userId: actor?.id,
      action: 'USER_UPDATED',
      entity: 'USUARIO',
      entityId: usuario.id,
      description: `Usuário atualizado: ${usuario.email}`,
      metadata: { updatedFields: Object.keys(updateData), targetUser: this.mapUsuario(usuario) },
    });

    return this.mapUsuario(usuario);
  }

  async setActive(id: string, isActive: boolean, actor?: UserActor) {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { isActive, versaoToken: isActive ? undefined : { increment: 1 } },
      select: this.userSelect,
    });

    await this.auditService.logAction({
      userId: actor?.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'USUARIO',
      entityId: usuario.id,
      description: `${isActive ? 'Ativacao' : 'Desativacao'} de usuario: ${usuario.email}`,
    });

    return this.mapUsuario(usuario);
  }

  async resetPassword(id: string, temporaryPassword: string, actor?: UserActor) {
    if (!temporaryPassword || temporaryPassword.length < 6) {
      throw new BadRequestException('Senha provisória deve ter pelo menos 6 caracteres.');
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        senhaHash: await bcrypt.hash(temporaryPassword, 10),
        requirePasswordChange: true,
        versaoToken: { increment: 1 },
      },
      select: this.userSelect,
    });

    await this.auditService.logAction({
      userId: actor?.id,
      action: 'USER_PASSWORD_RESET',
      entity: 'USUARIO',
      entityId: usuario.id,
      description: `Administrador redefiniu a senha provisória do usuário: ${usuario.email}`,
    });

    return this.mapUsuario(usuario);
  }

  async remove(id: string, actor?: UserActor) {
    return this.setActive(id, false, actor);
  }
}
