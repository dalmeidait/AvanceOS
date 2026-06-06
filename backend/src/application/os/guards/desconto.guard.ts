import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class DescontoGuard implements CanActivate {
  canActivate(): boolean {
    // A governanca de desconto consulta a OS real no banco em OsService.aplicarDesconto.
    return true;
  }
}
