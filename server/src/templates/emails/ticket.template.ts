import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  responsiveStyles,
} from './styles';

export const ticketTemplate = (
  name: string,
  qrCodeDataUrl: string,
  ticketType: string
): string => {
  const eventDetailsStyle = `
    background: #f3f4f6;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  `;

  const warningBoxStyle = `
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 15px;
    margin: 20px 0;
  `;

  const footerStyle = `
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  `;

  return `
    ${responsiveStyles}
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">DridCon 2026 Ticket</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        <p style="${paragraphStyles}">Thank you for registering for DridCon 2026. Please find your ticket details below.</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <p style="${paragraphStyles}"><strong>Present this QR code at the entrance</strong></p>
          <img class="qr" src="${qrCodeDataUrl}" alt="QR Code" style="display:block; margin:0 auto; width: 240px; height: 240px;" />
        </div>

        <div style="${eventDetailsStyle}">
          <p style="margin: 0 0 10px 0;"><strong>Event:</strong> Research Conference and Innovation Fair.</p>
          <p style="margin: 0 0 10px 0;"><strong>Ticket Type:</strong> ${ticketType}</p>
          <p style="margin: 0 0 10px 0;"><strong>Venue:</strong> Akin Deko Auditorium, University of Benin.</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> January 21, 2026</p>
          <p style="margin: 0;"><strong>Important:</strong> Bring this QR code (digital or printed)</p>
        </div>

        <div style="${warningBoxStyle}">
          <p style="margin: 0; color: #92400e;">
            ⚠️ <strong>Note:</strong> This QR code can only be scanned once. Do not share with others.
          </p>
        </div>

        <p style="${paragraphStyles}">We look forward to seeing you at DridCon!</p>
        
        <div style="${footerStyle}">
          <p style="font-size: 14px; color: #6b7280; margin: 5px 0;">
            <strong>Join our WhatsApp group for live updates and important announcements:</strong> <a href="https://chat.whatsapp.com/FPqBJ7fJNIV69moaqqcfeq?mode=hqrc">DridCon Attendees Group</a>
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            For inquiries: drid@uniben.edu
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            Visit for more information: https://sites.google.com/uniben.edu/dridrecon
          </p>
        </div>
      </div>
    </div>
  `;
};
