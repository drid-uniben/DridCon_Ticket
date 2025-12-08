/* eslint-disable max-len */
import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  responsiveStyles,
} from './styles';

export const registrationConfirmationTemplate = (name: string): string => {
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

  return `
    ${responsiveStyles}
    <div class="email-container" style="${containerStyles}">
      <div class="email-card" style="${cardStyles}">
        <h1 style="${headerStyles}">DridCon 2025 Registration</h1>
        <p style="${paragraphStyles}">Hi ${name},</p>
        <p style="${paragraphStyles}">Thank you for registering for DridCon! Your registration was successful.</p>
        <p style="${paragraphStyles}">You will receive your ticket details, including your QR code for entry, as soon as your payment is confirmed by our team.</p>
        
        <div style="${eventDetailsStyle}">
          <p style="margin: 0 0 10px 0;"><strong>Event:</strong> Research, Development & Innovation Conference</p>
          <p style="margin: 0;">Get ready for an immersive experience with insightful talks, hands-on workshops, and networking opportunities with leading experts in the field. We'll be covering the latest trends in software development, AI, and more.</p>
        </div>

        <p style="${paragraphStyles}">We look forward to seeing you at DridCon!</p>

        <div style="${footerStyle}">
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
