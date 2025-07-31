import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => {
  return {
    provider: process.env.NOTIFICATION_PROVIDER || 'gmail',
    gmail: {
      service: process.env.GMAIL_SERVICE,
      host: process.env.GMAIL_HOST,
      port: parseInt(process.env.GMAIL_PORT || '465', 10),
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_PASSWORD,
    },
    slack: {},
  };
});
