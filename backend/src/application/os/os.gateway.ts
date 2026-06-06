import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { getCorsOrigin } from '../../config/env';

@WebSocketGateway({ cors: { origin: getCorsOrigin(), credentials: true } })
export class OsGateway {
  @WebSocketServer()
  server: Server;

  broadcastNovaOS(os: any) {
    if (this.server) {
      this.server.emit('nova_os_criada', os);
    } else {
      console.warn('⚠️ WebSocket Server não está inicializado para OsGateway.');
    }
  }
}
