import {
  containerStyles,
  cardStyles,
  headerStyles,
  paragraphStyles,
  buttonStyles,
  responsiveStyles,
} from './styles';

export const agentCredentialsTemplate = (
  email: string,
  password: string,
  loginUrl: string
): string => `
  ${responsiveStyles}
  <div class="email-container" style="${containerStyles}">
    <div class="email-card" style="${cardStyles}">
      <h1 style="${headerStyles}">Your DridCon Agent Account</h1>
      <p style="${paragraphStyles}">Hello,</p>
      <p style="${paragraphStyles}">
        An agent account has been created for you on the DridCon platform. You can now log in to manage attendee check-ins.
      </p>
      <p style="${paragraphStyles}">
        Please use the following credentials to log in:
      </p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 16px;">
        <strong>Email:</strong> ${email}<br/>
        <strong>Password:</strong> ${password}
      </div>
      <a href="${loginUrl}" style="${buttonStyles}">Log in to your Account</a>
      <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
        If you did not expect this, you can safely ignore this email.
      </p>
    </div>
  </div>
`;
