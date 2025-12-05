import { styles } from './styles';

export const agentCredentialsTemplate = (email: string, password: string, loginUrl: string): string => `
  <div style="${styles.container}">
    <div style="${styles.card}">
      <h1 style="${styles.heading}">Your DridCon Agent Account</h1>
      <p style="${styles.paragraph}">Hello,</p>
      <p style="${styles.paragraph}">
        An agent account has been created for you on the DridCon platform. You can now log in to manage attendee check-ins.
      </p>
      <p style="${styles.paragraph}">
        Please use the following credentials to log in:
      </p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 16px;">
        <strong>Email:</strong> ${email}<br/>
        <strong>Password:</strong> ${password}
      </div>
      <p style="${styles.paragraph}">
        We strongly recommend that you change your password after your first login.
      </p>
      <a href="${loginUrl}" style="${styles.button}">Log in to your Account</a>
      <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
        If you did not expect this, you can safely ignore this email.
      </p>
    </div>
  </div>
`;
