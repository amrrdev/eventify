// clients/slack-notification-client.ts
import { Injectable } from '@nestjs/common';
import { NotificationClient } from '../interfaces/notification-client.interface';

@Injectable()
export class SlackNotificationClient implements NotificationClient {
  async send({ text }: { text: string }) {
    // integrate Slack SDK or use webhook
    console.log(`Sending to Slack: ${text}`);
  }
}
