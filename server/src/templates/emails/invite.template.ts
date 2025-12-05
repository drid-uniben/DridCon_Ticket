import { styles } from './styles';

export const attendeeInviteTemplate = (registrationUrl: string): string => {
  return `
    <div style="${styles.container}">
      <div style="${styles.card}">
        <h1 style="${styles.heading}">DridCon Registration Invitation</h1>
        <p style="${styles.paragraph}">Dear prospective attendee,</p>
        <p style="${styles.paragraph}">
          You have been invited to register for DridCon. Please click the link below to complete your registration:
        </p>
        <p style="${styles.buttonContainer}">
          <a href="${registrationUrl}" style="${styles.button}">Complete Registration</a>
        </p>
        <p style="${styles.paragraph}">
          This link is valid for 24 hours.
        </p>
        <p style="${styles.signature}">The DridCon Team</p>
      </div>
    </div>
  `;
};
