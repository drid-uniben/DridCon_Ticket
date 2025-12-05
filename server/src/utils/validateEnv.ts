import dotenv from 'dotenv';
import { cleanEnv, str, port, url, email, num, makeValidator } from 'envalid';
dotenv.config();

const validateEnv = (): void => {
  const emailsList = makeValidator((input: string) => {
    const emails = input.split(',').map((e) => e.trim());
    emails.forEach((e) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        throw new Error(`Invalid email address: "${e}"`);
      }
    });
    return emails;
  });

  const extendedEmail = makeValidator((input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Extract email from "Display Name <email@domain.com>" format if present
    const emailPart = input.match(/<([^>]+)>/)?.[1] || input;
    if (!emailRegex.test(emailPart)) {
      throw new Error(`Invalid email address: "${emailPart}"`);
    }
    return input;
  });

  cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
    PORT: num({ default: 3000 }),
    MONGODB_URI: url(),
    FRONTEND_URL: url(),
    API_URL: url(),
    LOG_LEVEL: str({
      choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
    }),
    JWT_ACCESS_SECRET: str(),
    JWT_REFRESH_SECRET: str(),
    SMTP_HOST: str(),
    SMTP_PORT: port(),
    SMTP_USER: str(),
    SMTP_PASS: str(),
    EMAIL_FROM: extendedEmail(),
    ADMIN_NAME: str(),
    ADMIN_EMAIL: email(),
    ADMIN_PASSWORD: str(),
  });
};

export default validateEnv;
