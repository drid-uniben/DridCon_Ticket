import { styles } from './styles';

export const ticketTemplate = (name: string): string => {
  return `
    <div style="${styles.container}">
      <div style="${styles.card}">
        <img src="cid:qrcode" alt="QR Code" style="${styles.qrCode}" />
        <h1 style="${styles.heading}">DridCon Ticket</h1>
        <p style="${styles.paragraph}">Dear ${name},</p>
        <p style="${styles.paragraph}">
          Thank you for registering for DridCon! Your ticket details and QR code are below.
          Please present this QR code at the event entrance for scanning.
        </p>
        <p style="${styles.paragraph}">
          We look forward to seeing you there!
        </p>
        <p style="${styles.signature}">The DridCon Team</p>
      </div>
    </div>
  `;
};
