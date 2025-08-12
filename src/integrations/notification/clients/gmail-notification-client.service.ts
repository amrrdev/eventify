import { Inject, Injectable, Logger } from '@nestjs/common';
import { IMailOptions } from '../interfaces/mail.interface';
import { NotificationClient } from '../interfaces/notification-client.interface';
import * as nodemailer from 'nodemailer';
import notificationConfig from '../config/notification.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class GmailNotificationClient implements NotificationClient {
  private readonly logger: Logger = new Logger(GmailNotificationClient.name);
  private transporter: nodemailer.Transporter;
  constructor(
    @Inject(notificationConfig.KEY) private readonly notificationConfigrations: ConfigType<typeof notificationConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      service: notificationConfigrations.gmail.service,
      host: notificationConfigrations.gmail.host,
      port: notificationConfigrations.gmail.port,
      auth: {
        user: notificationConfigrations.gmail.user,
        pass: notificationConfigrations.gmail.password,
      },
      secure: true,
    });
  }
  // workflow@gmail.com

  async send(mailOptions: IMailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.notificationConfigrations.gmail.user,
        ...mailOptions,
      });
    } catch (error) {
      this.logger.error(error.message);
    }
  }
}
