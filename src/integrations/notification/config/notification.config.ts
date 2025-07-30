import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => {
  return {
    gmail: {
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_PASSWORD,
    },
  };
});

// ABSTRACT NOTIFICATION_SERVICE
// GMAIL
// SLACK

// new NotificationService(new Gmail())
// new NotificationService(new Slack())
