import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import validateEnv from '../utils/validateEnv';
import {
  agentCredentialsTemplate,
  withdrawalStatusTemplate,
} from '../templates/emails';

validateEnv();

class EmailService {
  private transporter: Transporter;
  private frontendUrl: string;
  private emailFrom: string;

  constructor() {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error(
        'SMTP configuration must be defined in environment variables'
      );
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.frontendUrl = process.env.FRONTEND_URL || '';
    this.emailFrom = process.env.EMAIL_FROM || '';

    if (!this.frontendUrl || !this.emailFrom) {
      throw new Error(
        'FRONTEND_URL and EMAIL_FROM must be defined in environment variables'
      );
    }
  }

  async sendAgentCredentialsEmail(
    email: string,
    name: string,
    password: string
  ): Promise<void> {
    const loginUrl = `${this.frontendUrl}/auth/login`; // General login URL

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Your EcoUNIBEN Agent Account Credentials',
        html: agentCredentialsTemplate(name, email, password, loginUrl),
      });
      logger.info(`Agent credentials email sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send agent credentials email:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async sendWithdrawalStatusEmail(
    email: string,
    name: string,
    amount: number,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    const subject = `Your Withdrawal Request Has Been ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: subject,
        html: withdrawalStatusTemplate(name, amount, status),
      });
      logger.info(`Withdrawal status email (${status}) sent to: ${email}`);
    } catch (error) {
      logger.error(
        `Failed to send withdrawal status email (${status}):`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export default new EmailService();
