// clients/slack-notification-client.ts
import { Injectable } from '@nestjs/common';
import { NotificationClient } from '../interfaces/notification-client.interface';
import { IMailOptions } from '../interfaces/mail.interface';

@Injectable()
export class SlackNotificationClient implements NotificationClient {
  async send(mailOptions: IMailOptions) {}
}
