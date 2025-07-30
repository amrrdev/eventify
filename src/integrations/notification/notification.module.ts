import { Module } from '@nestjs/common';
import { NOTIFICATION_CLIENT } from './notification.constants';
import notificationConfig from './config/notification.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationService } from './notification.service';
@Module({
  imports: [ConfigModule.forFeature(notificationConfig)],
  providers: [
    {
      provide: NOTIFICATION_CLIENT,
      useFactory: (notificationConfigrations: ConfigType<typeof notificationConfig>) => {
        return nodemailer.createTransport({
          service: 'Gmail',
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: notificationConfigrations.gmail.user,
            pass: notificationConfigrations.gmail.password,
          },
        });
      },
      inject: [notificationConfig.KEY],
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
