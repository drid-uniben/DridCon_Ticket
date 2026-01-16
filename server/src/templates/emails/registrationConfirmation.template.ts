/* eslint-disable max-len */
import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  responsiveStyles,
} from './styles';

export const registrationConfirmationTemplate = (
  name: string,
  ticketType?: string,
  wantsPreConference?: boolean
): string => {
  const eventDetailsStyle = `
    background: #f3f4f6;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  `;

  const footerStyle = `
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  `;

  const isLecturerPremium = ticketType === 'Lecturer Premium';

  const isResearcherPremium = ticketType === 'Researcher Premium';

  return `
    ${responsiveStyles}
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">DridCon 2026 Registration</h1>
        <p style="${paragraphStyles}">Hi ${name},</p>
        <p style="${paragraphStyles}">Thank you for registering for DridCon! Your registration was successful.</p>

        ${
          isResearcherPremium
            ? `
  <p style="${paragraphStyles}">
    <strong>Researcher Premium Benefits:</strong> As a Researcher Premium attendee, 
    you have the option to attend the Pre-Conference Session on January 20, 2026. 
  </p>
  <div style="${eventDetailsStyle}">
    <p style="margin: 0 0 10px 0;">
      The Pre-Conference Session is an exclusive opportunity for deeper engagement with 
      experts on commercializing research and innovation.
    </p>
    ${
      wantsPreConference
        ? `<p style="margin: 0;">
             You indicated you <strong>want to attend the Pre-Conference Session</strong>. We will send you further details and your Pre-Conference ticket upon payment confirmation.
           </p>`
        : `<p style="margin: 0;">
             You chose to focus on the Main Conference only during registration as this aligns with your preferences/schedule and we are expecting you to attend the Main Conference on January 21, 2026.
           </p>`
    }
  </div>
`
            : ''
        }
        
        ${
          isLecturerPremium
            ? `
          <p style="${paragraphStyles}">
            <strong>Lecturer Premium Ticket Benefits:</strong> You will receive <strong>TWO separate tickets</strong> with unique QR codes:
          </p>
          <div style="${eventDetailsStyle}">
            <p style="margin: 0 0 15px 0;">
              <strong>1. Pre-Conference Session Ticket (January 20, 2026)</strong><br/>
              Access to exclusive pre-conference workshops and networking
            </p>
            <p style="margin: 0 0 10px 0;">
              <strong>2. Main Conference Ticket (January 21, 2026)</strong><br/>
              Full access to the main conference and innovation fair
            </p>
          </div>
          <p style="${paragraphStyles}">
            Both tickets will be sent to your email separately once your payment is confirmed by our team.
          </p>
        `
            : `
          <p style="${paragraphStyles}">
            You will receive your ticket details, including your QR code for entry, as soon as your payment is confirmed by our team.
          </p>
        `
        }
        
        <div style="${eventDetailsStyle}">
          <p style="margin: 0 0 10px 0;"><strong>Event:</strong> Research Conference and Innovation Fair</p>
          ${
            isLecturerPremium
              ? `
            <p style="margin: 0 0 10px 0;"><strong>Pre-Conference:</strong> January 20, 2026</p>
            <p style="margin: 0 0 10px 0;"><strong>Main Conference:</strong> January 21, 2026</p>
          `
              : `
            <p style="margin: 0 0 10px 0;"><strong>Date:</strong> January 21, 2026</p>
          `
          }
          <p style="margin: 0 0 10px 0;"><strong>Venue:</strong> Akin Deko Auditorium, University of Benin</p>
          <p style="margin: 0;">Get ready for an immersive experience with insightful talks, hands-on workshops, and networking opportunities with leading experts in the field.</p>
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
