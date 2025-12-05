import {
    primaryColor,
    backgroundColor,
    textColor,
    containerStyles,
    cardStyles,
    headerStyles,
    paragraphStyles
  } from './styles';

  export const withdrawalStatusTemplate = (name: string, amount: number, status: 'approved' | 'rejected'): string => {
    const isApproved = status === 'approved';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const statusColor = isApproved ? primaryColor : '#ef4444'; // Use primary for approved, red for rejected

    return `
      <div style="${containerStyles}">
        <div style="${cardStyles}">
          <h1 style="${headerStyles}">Withdrawal Request Update</h1>
          <p style="${paragraphStyles}">Hello ${name},</p>
          <p style="${paragraphStyles}">
            This is an update on your recent withdrawal request.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin-bottom: 20px; font-size: 16px; border-left: 5px solid ${statusColor};">
            <p><strong>Amount:</strong> NGN ${amount.toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
          </div>
          ${isApproved
            ? `<p style="${paragraphStyles}">The funds will be transferred to your bank account shortly. Thank you for using EcoUNIBEN!</p>`
            : `<p style="${paragraphStyles}">Your withdrawal request has been rejected. The points have been returned to your wallet. If you have any questions, please contact our support team.</p>`
          }
          <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }
