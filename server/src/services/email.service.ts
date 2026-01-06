import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import validateEnv from '../utils/validateEnv';
import {
  agentCredentialsTemplate,
  attendeeInviteTemplate,
  ticketTemplate,
  registrationConfirmationTemplate,
  preConferenceTicketTemplate,
  declineRegistrationTemplate,
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
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
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

  async sendAgentCredentials(email: string, password: string): Promise<void> {
    const loginUrl = `${this.frontendUrl}/login`; // Unified login

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Your DridCon Agent Account Credentials',
        html: agentCredentialsTemplate(email, password, loginUrl),
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

  async sendTicketWithQR(
    email: string,
    name: string,
    qrCodeDataUrl: string,
    ticketType: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Your DridCon Ticket and QR Code',
        html: ticketTemplate(name, qrCodeDataUrl, ticketType),
      });
      logger.info(`Ticket with QR code sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send ticket with QR code:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async sendAttendeeInvite(email: string, inviteToken: string): Promise<void> {
    const registrationUrl = `${this.frontendUrl}/complete-registration?token=${inviteToken}`;

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Complete Your DridCon Registration',
        html: attendeeInviteTemplate(registrationUrl),
      });
      logger.info(`Attendee invite sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send attendee invite:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async sendRegistrationConfirmation(
    email: string,
    name: string,
    ticketType?: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'DridCon Registration Confirmation',
        html: registrationConfirmationTemplate(name, ticketType),
      });
      logger.info(`Registration confirmation email sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send registration confirmation email:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async sendPreConferenceTicket(
    email: string,
    name: string,
    qrCodeDataUrl: string,
    ticketType: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Your DridCon Pre-Conference Ticket (January 20)',
        html: preConferenceTicketTemplate(name, qrCodeDataUrl, ticketType),
      });
      logger.info(`Pre-conference ticket sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send pre-conference ticket:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async sendDeclineRegistrationEmail(
    email: string,
    name: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'DridCon 2026 Registration Update',
        html: declineRegistrationTemplate(name),
      });
      logger.info(`Registration decline email sent to: ${email}`);
    } catch (error) {
      logger.error(
        'Failed to send registration decline email:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}

const emailService = new EmailService();

export default emailService;
