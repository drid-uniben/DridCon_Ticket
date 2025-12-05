import {
    primaryColor,
    backgroundColor,
    textColor,
    containerStyles,
    cardStyles,
    headerStyles,
    buttonStyles,
    paragraphStyles
  } from './styles';

  export const agentCredentialsTemplate = (name: string, email: string, password: string, loginUrl: string): string => `
    <div style="${containerStyles}">
      <div style="${cardStyles}">
        <h1 style="${headerStyles}">Your EcoUNIBEN Agent Account</h1>
        <p style="${paragraphStyles}">Hello ${name},</p>
        <p style="${paragraphStyles}">
          An agent account has been created for you on the EcoUNIBEN platform. You can now log in to start managing waste collection and earning rewards for users.
        </p>
        <p style="${paragraphStyles}">
          Please use the following credentials to log in:
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 16px;">
          <strong>Email:</strong> ${email}<br/>
          <strong>Password:</strong> ${password}
        </div>
        <p style="${paragraphStyles}">
          We strongly recommend that you change your password after your first login.
        </p>
        <a href="${loginUrl}" style="${buttonStyles}">Log in to your Account</a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
          If you did not expect this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
