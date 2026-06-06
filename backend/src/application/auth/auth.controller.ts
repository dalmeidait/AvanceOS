import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const isProduction = process.env.NODE_ENV === 'production';
const loginThrottleTtl = Number(process.env.LOGIN_THROTTLE_TTL ?? process.env.THROTTLE_TTL ?? 60000);
const loginThrottleLimit = Number(process.env.LOGIN_THROTTLE_LIMIT ?? (isProduction ? 5 : 60));

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: loginThrottleLimit, ttl: loginThrottleTtl } })
  @Post('login')
  async login(@Body() body: LoginDto, @Request() req: any) {
    return this.authService.login(body.email, body.senha, body.mfaCode, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  async generateMfa(@Request() req: any) {
    return this.authService.generateMfaSecret(req.user.id, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-on')
  async turnOnMfa(@Request() req: any, @Body() body: { mfaCode: string }) {
    return this.authService.turnOnMfa(req.user.id, body.mfaCode);
  }

  @Post('alterar-senha')
  async alterarSenha(@Body() body: { email: string, senhaAtual: string, novaSenha: string }) {
    return this.authService.alterarSenha(body.email, body.senhaAtual, body.novaSenha);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, body.senhaAtual, body.novaSenha, body.confirmarNovaSenha);
  }
}
