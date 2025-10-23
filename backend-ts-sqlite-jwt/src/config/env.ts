import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  JWT_SECRET: process.env.JWT_SECRET ?? 'change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1d'
};
