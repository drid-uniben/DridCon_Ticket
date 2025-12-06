import { containerStyles, cardStyles, headerStyles, paragraphStyles, buttonStyles } from './styles';

export const attendeeInviteTemplate = (registrationUrl: string): string => {
  const signatureStyle = `
    font-style: italic;
    color: #6b7280;
    margin-top: 20px;
  `;

  return `
    <div style="${containerStyles}">
      <div style="${cardStyles}">
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
      </div>
    </div>
  `;
};
