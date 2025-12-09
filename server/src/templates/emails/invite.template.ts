import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  buttonStyles,
} from './styles';

export const attendeeInviteTemplate = (registrationUrl: string): string => {
  const signatureStyle = `
    font-style: italic;
    color: #6b7280;
    margin-top: 20px;
  `;

  return `
    
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">DridCon Registration Invitation</h1>
        <p style="${paragraphStyles}">Dear prospective attendee,</p>
        <p style="${paragraphStyles}">
          You have been invited to register for DridCon. Please click the link below to complete your registration:
        </p>
        <p style="${paragraphStyles}">
          <a href="${registrationUrl}" style="${buttonStyles}">Complete Registration</a>
        </p>
        <p style="${paragraphStyles}">
          This link is valid for 24 hours.
        </p>
        <p style="${signatureStyle}">The DridCon Team</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
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
