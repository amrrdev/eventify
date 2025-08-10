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

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})
@Injectable()
export class EventWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectedClients = new Set<Socket>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly jwtConfigrations: ConfigType<typeof jwtConfig>,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = this.extractTokenFromHeader(client);

      if (!token) {
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.jwtConfigrations.secret,
        issuer: this.jwtConfigrations.issuer,
        audience: this.jwtConfigrations.audience,
      });

      // Store user data first
      client.data[REQUEST_USER_KEY] = payload;

      // Add to connected clients
      this.connectedClients.add(client);

      // Join user-specific room
      await client.join(`user_${payload.sub}`);

      // Send initial data after everything is set up
      await this.sendInitialData(client, payload);
    } catch (error) {
      client.emit('error', { message: 'Authentication failed', error: error.message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket, ...args: any[]) {
    try {
      // Remove from connected clients
      this.connectedClients.delete(client);

      const payload: ActiveUserDate = client.data[REQUEST_USER_KEY];
      if (payload) {
        // Leave the user room
        client.leave(`user_${payload.sub}`);
      } else {
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  broadcastToUser(userId: string, events: any[] | Record<string, number>) {
    this.server.to(`user_${userId}`).emit('events', events);
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Try to get token from query parameters first
    const queryToken = client.handshake.query['token'];
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    // Fallback to authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    return undefined;
  }

  broadcastMetrics(userId: string, metrics: any): void {
    this.server.to(`user_${userId}`).emit('dashboard_data', metrics);
    // this.connectedClients.forEach((client) => {
    //   client.emit('dashboard_data', metrics);
    // });
  }

  private async sendInitialData(client: Socket, payload?: any) {
    try {
      // Send any cached/initial data when client first connects
      // You can call your existing metrics service here
      const initialData = {
        totalEvents: 0,
        activeUsers: 0,
        eventsPerHour: 0,
        errorRate: 0,
        volumeChart: [],
        topEvents: [],
        deviceBreakdown: [],
        liveEvents: [],
        userId: payload?.sub || null,
        connectedAt: new Date().toISOString(),
      };

      client.emit('dashboard_data', initialData);
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }
}
