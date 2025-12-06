import { containerStyles, cardStyles, headerStyles, paragraphStyles } from './styles';

export const ticketTemplate = (name: string): string => {
  const qrCodeStyle = `
    display: block;
    margin: 20px auto;
    width: 200px;
    height: 200px;
  `;

  const signatureStyle = `
    font-style: italic;
    color: #6b7280;
    margin-top: 20px;
  `;

  return `
    <div style="${containerStyles}">
      <div style="${cardStyles}">
        <img src="cid:qrcode" alt="QR Code" style="${qrCodeStyle}" />
        <h1 style="${headerStyles}">DridCon Ticket</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        <p style="${paragraphStyles}">
          Thank you for registering for DridCon! Your ticket details and QR code are below.
          Please present this QR code at the event entrance for scanning.
        </p>
        <p style="${paragraphStyles}">
          We look forward to seeing you there!
        </p>
        <p style="${signatureStyle}">The DridCon Team</p>
      </div>
    </div>
  `;
};
