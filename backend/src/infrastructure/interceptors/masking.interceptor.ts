import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { auditStorage } from '../../application/audit/audit.storage';

@Injectable()
export class LgpdMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Injeta userId no auditStore se disponível ao passar pelo Guard (Requisito 2.1 Audit)
    const store = auditStorage.getStore();
    if (store && request.user) {
        store.userId = request.user.id;
    }

    // Se a rota for explicitamente solicitando dados limpos, evitamos mascarar
    if (request.url.includes('/limpo')) {
        return next.handle();
    }

    // Nas telas operacionais autenticadas, CPF/CNPJ e telefone precisam voltar completos
    // para evitar edicoes com dados parciais. Mascaras de LGPD ficam opt-in por ambiente.
    return next.handle().pipe(map(data => this.maskData(data)));
  }

  private maskData(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.maskData(item));
    }

    if (typeof data === 'object') {
      const masked = { ...data };
      for (const key of ['senha', 'senhaHash', 'mfaSecret']) {
        if (key in masked) delete masked[key];
      }
      if (process.env.LGPD_MASKING_ENABLED === 'true') {
        if (masked.cpf_cnpj && typeof masked.cpf_cnpj === 'string') {
          masked.cpf_cnpj = this.obfuscateCpf(masked.cpf_cnpj);
        }
        if (masked.telefone && typeof masked.telefone === 'string') {
          masked.telefone = this.obfuscatePhone(masked.telefone);
        }
      }
      // Evitar recursão infinita se tiver instâncias Prisma não padronizaveis
      for (const key in masked) {
         if (typeof masked[key] === 'object' && masked[key] != null && !Array.isArray(masked[key])) {
             if (Object.getPrototypeOf(masked[key]) === Object.prototype) {
                 masked[key] = this.maskData(masked[key]);
             }
         } else if (Array.isArray(masked[key])) {
             masked[key] = masked[key].map((i: any) => this.maskData(i));
         }
      }
      return masked;
    }

    return data;
  }

  private obfuscateCpf(cpf: string): string {
    if (cpf.length <= 4) return cpf;
    return `***.***.***-${cpf.slice(-2)}`;
  }

  private obfuscatePhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return `(***) *****-${phone.slice(-4)}`;
  }
}
