import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  responsiveStyles,
} from './styles';

export const declineRegistrationTemplate = (name: string): string => {
  const footerStyle = `
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  `;

  const reasonsListStyle = `
    padding-left: 20px;
    margin-bottom: 20px;
  `;

  return `
    ${responsiveStyles}
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">DridCon 2026 Registration Update</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        <p style="${paragraphStyles}">
          We are writing to inform you that your registration for DridCon 2026 could not be approved at this time.
        </p>
        <p style="${paragraphStyles}">This may be due to one of the following reasons:</p>
        <ul style="${reasonsListStyle}">
          <li>Your payment could not be confirmed or was invalid.</li>
          <li>The image you uploaded was not a valid payment receipt.</li>
          <li>A duplicate registration was made using the same payment receipt. Please note that each ticket requires a unique payment.</li>
        </ul>
        <p style="${paragraphStyles}">
          You can try registering again using an alternate email address and a valid, unique payment receipt.
        </p>
        <p style="${paragraphStyles}">
          If you believe this is an error or have any questions, please contact our support team at <strong>drid@uniben.edu</strong> for assistance.
        </p>
        <div style="${footerStyle}">
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            For more information, visit our website: <a href="https://sites.google.com/uniben.edu/dridrecon">DridCon Website</a>
          </p>
        </div>
      </div>
    </div>
  `;
};
