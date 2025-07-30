import { Module } from '@nestjs/common';
import { NOTIFICATION_CLIENT } from './notification.constants';
import notificationConfig from './config/notification.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { GmailNotificationClient } from './clients/gmail-notification-client.service';

@Module({
  imports: [ConfigModule.forFeature(notificationConfig)],
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
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
