import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_CLIENT } from './notification.constants';
import * as nodemailer from 'nodemailer';
import notificationConfig from './config/notification.config';
import { ConfigType } from '@nestjs/config';
import { MailOptions } from './interfaces/mail.inerfaces';

@Injectable()
export class NotificationService {
  private readonly logger: Logger = new Logger(NotificationService.name);
  constructor(
    @Inject(NOTIFICATION_CLIENT) private transporter: nodemailer.Transporter,
    @Inject(notificationConfig.KEY) private readonly notificationConfigrations: ConfigType<typeof notificationConfig>,
  ) {}

  async sendEmail(mailOptions: MailOptions) {
    try {
      const info = await this.transporter.sendMail(this.setupMailOptions(mailOptions));
      console.log(info);
    } catch (error) {
      this.logger.warn(error);
    }
  }

  private setupMailOptions(mailOptions: MailOptions) {
    return {
      from: this.notificationConfigrations.gmail.user,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
    };
  }
}
