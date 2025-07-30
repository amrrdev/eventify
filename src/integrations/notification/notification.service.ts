import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_CLIENT } from './notification.constants';
import { IMailOptions } from './interfaces/mail.interface';
import { NotificationClient } from './interfaces/notification-client.interface';

@Injectable()
export class NotificationService {
  constructor(@Inject(NOTIFICATION_CLIENT) private readonly notificationClient: NotificationClient) {}

  async sendEmail(options: IMailOptions) {
    return this.notificationClient.send(options);
  }
}
