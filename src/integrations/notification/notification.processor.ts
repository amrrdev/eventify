import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { NotificationService } from './notification.service';
import { IMailOptions } from './interfaces/mail.interface';

@Processor(NOTIFICATION_QUEUE)
export class NotificatationProcessor extends WorkerHost {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    const mailOptions: IMailOptions = job.data;
    return await this.notificationService.sendEmail(mailOptions);
  }
}
