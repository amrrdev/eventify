import { Client } from '@grpc/grpc-js';
import { Inject, Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { REQUEST_USER_KEY } from '../iam/iam.constants';
import { ActiveUserDate } from '../iam/interfaces/active-user-data.interface';
import jwtConfig from '../iam/config/jwt.config';
import { ConfigType } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class EventWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly jwtConfigrations: ConfigType<typeof jwtConfig>,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket, ...args: any[]) {
    const token = this.extractTokenFromHeader(client);
    if (!token) {
      console.log('No token provided');
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtConfigrations.secret,
        issuer: this.jwtConfigrations.issuer,
        audience: this.jwtConfigrations.audience,
      });

      client.data[REQUEST_USER_KEY] = payload;
      client.join(`user_${payload.sub}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: any, ...args: any[]) {
    const payload: ActiveUserDate = client.data[REQUEST_USER_KEY];
    if (payload) {
      console.log(`User ${payload.sub} disconnected from WebSocket`);
    }
  }

  broadcastToUser(userId: string, events: any[]) {
    this.server.to(`user_${userId}`).emit('events', events);
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    return client.handshake.headers.authorization?.split(' ')[1];
  }
}
