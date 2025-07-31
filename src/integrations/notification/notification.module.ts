import { Module } from '@nestjs/common';
import { NOTIFICATION_CLIENT, NOTIFICATION_QUEUE } from './notification.constants';
import notificationConfig from './config/notification.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { GmailNotificationClient } from './clients/gmail-notification-client.service';
import { BullModule } from '@nestjs/bullmq';
import { NotificatationProcessor } from './notification.processor';

@Module({
  imports: [
    ConfigModule.forFeature(notificationConfig),
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  providers: [
    {
      provide: NOTIFICATION_CLIENT,
      useFactory: (notificationConfigrations: ConfigType<typeof notificationConfig>) => {
        const clientType = notificationConfigrations.provider;
        switch (clientType) {
          case 'gmail':
            return new GmailNotificationClient(notificationConfigrations);
          default:
            throw new Error(`Unknown notification provider: ${clientType}`);
        }
      },
      inject: [notificationConfig.KEY],
    },
    NotificationService,
    GmailNotificationClient,
    NotificatationProcessor,
  ],
  exports: [NotificationService, BullModule],
})
export class NotificationModule {}
