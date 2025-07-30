import { IMailOptions } from './mail.interface';

export interface NotificationClient {
  send(mailOptions: IMailOptions): Promise<void>;
}
