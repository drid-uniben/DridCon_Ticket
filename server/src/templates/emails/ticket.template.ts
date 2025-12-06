import { containerStyles, cardStyles, headerStyles, paragraphStyles } from './styles';

export const ticketTemplate = (name: string): string => {
  const qrCodeStyle = `
    display: block;
    margin: 20px auto;
    width: 250px;
    height: 250px;
  `;

  const highlightBoxStyle = `
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    text-align: center;
  `;

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
    <div style="${containerStyles}">
      <div style="${cardStyles}">
        <div style="${highlightBoxStyle}">
          <img src="cid:qrcode" alt="QR Code" style="${qrCodeStyle}" />
          <p style="color: white; font-size: 14px; margin-top: 10px; margin-bottom: 0;">
            <strong>Present this QR code at the entrance</strong>
          </p>
        </div>

        <h1 style="${headerStyles}">DridCon 2024 Ticket</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        
        <div style="${eventDetailsStyle}">
          <p style="margin: 0 0 10px 0;"><strong>Event:</strong> Research, Innovation & Enterprise Conference</p>
          <p style="margin: 0 0 10px 0;"><strong>Venue:</strong> UNIBEN Campus</p>
          <p style="margin: 0;"><strong>Important:</strong> Bring this QR code (digital or printed)</p>
        </div>

        <div style="${warningBoxStyle}">
          <p style="margin: 0; color: #92400e;">
            ⚠️ <strong>Note:</strong> This QR code can only be scanned once. Do not share with others.
          </p>
        </div>

        <p style="${paragraphStyles}">We look forward to seeing you at DridCon!</p>
        
        <div style="${footerStyle}">
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            For inquiries: journal@uniben.edu
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            Visit: https://sites.google.com/uniben.edu/dridrecon
          </p>
        </div>
      </div>
    </div>
  `;
};
