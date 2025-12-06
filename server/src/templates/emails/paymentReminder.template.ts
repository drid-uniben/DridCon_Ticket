import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
} from './styles';

export const paymentReminderTemplate = (
  name: string,
  amount: string
): string => {
  const paymentBoxStyle = `
    background: #fef3c7;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  `;

  const highlightBoxStyle = `
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    text-align: center;
    color: white;
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
          <p style="font-size: 24px; margin: 0 0 10px 0;">⏰</p>
          <h2 style="margin: 0; font-size: 20px;">Complete Your Registration</h2>
        </div>

        <h1 style="${headerStyles}">DridCon Payment Reminder</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        <p style="${paragraphStyles}">
          Your DridCon registration is almost complete! We're waiting to verify your payment of <strong>${amount}</strong>.
        </p>
        
        <div style="${paymentBoxStyle}">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Payment Details:</p>
          <p style="margin: 0 0 5px 0; color: #78350f;">Bank: UNIBEN MFB</p>
          <p style="margin: 0 0 5px 0; color: #78350f;">Account: 1100097619</p>
          <p style="margin: 0; color: #78350f;">Account Name: RESEARCH INNOVATION AND DEVELOPMENT FAIR</p>
        </div>

        <p style="${paragraphStyles}">
          Once we confirm your payment, you'll receive your QR code ticket immediately.
        </p>

        <p style="${paragraphStyles}">
          If you've already made the payment, please disregard this email. Our team will process it shortly.
        </p>
        
        <div style="${footerStyle}">
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            For inquiries: drid@uniben.edu
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            Visit: https://sites.google.com/uniben.edu/dridrecon
          </p>
        </div>
      </div>
    </div>
  `;
};
