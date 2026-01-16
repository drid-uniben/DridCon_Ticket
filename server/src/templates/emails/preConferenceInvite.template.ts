import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  buttonStyles,
  responsiveStyles,
} from './styles';

export const preConferenceInviteTemplate = (
  name: string,
  responseUrl: string
): string => {
  const eventDetailsStyle = `
    background: #f3f4f6;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  `;

  const highlightBoxStyle = `
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 15px;
    margin: 20px 0;
  `;

  return `
    ${responsiveStyles}
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">Exclusive Pre-Conference Invitation</h1>
        <p style="${paragraphStyles}">Dear ${name},</p>
        <p style="${paragraphStyles}">
          As a valued Researcher Premium attendee, you have the exclusive opportunity to attend 
          our Pre-Conference Session on <strong>January 20, 2026</strong>.
        </p>

        <div style="${eventDetailsStyle}">
          <p style="margin: 0 0 10px 0;"><strong>Event:</strong> DridCon Pre-Conference Session</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> January 20, 2026</p>
          <p style="margin: 0 0 10px 0;"><strong>Venue:</strong> Akin Deko Auditorium, UNIBEN</p>
          <p style="margin: 0 0 10px 0;"><strong>Focus:</strong> Commercializing Research & Innovation</p>
          <p style="margin: 0;">Network with experts and gain practical insights on translating research into commercial impact.</p>
        </div>

        <div style="${highlightBoxStyle}">
          <p style="margin: 0; color: #92400e;">
            <strong>This is completely optional!</strong> Your main conference access (January 21) 
            is already confirmed regardless of your choice.
          </p>
        </div>

        <p style="${paragraphStyles}">
          Would you like to attend the Pre-Conference Session?
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${responseUrl}" style="${buttonStyles}">Respond to Invitation</a>
        </div>

        <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
          This invitation expires in 7 days. If you don't respond, no action will be taken - 
          your main conference ticket remains valid.
        </p>
      </div>
    </div>
  `;
};
