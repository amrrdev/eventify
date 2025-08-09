import { Module } from '@nestjs/common';
import { EventWebSocketGateway } from './events-websocket.gateway';
import { StreamWebSocketBatcher } from './stream-websocket-batcher.service';
import jwtConfig from '../iam/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { WEBSOCKET_EVENTS_QUEUE } from './constants/websocket.constant';
import { WebSocketEventProcessor } from './events-websocket.processor';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    BullModule.registerQueue({
      name: WEBSOCKET_EVENTS_QUEUE,
    }),
  ],
  providers: [EventWebSocketGateway, StreamWebSocketBatcher, WebSocketEventProcessor],
  exports: [StreamWebSocketBatcher, EventWebSocketGateway],
})
export class EventWebSocketModule {}
