// styles.ts
export const primaryColor = '#16a34a'; // Tailwind's green-600
export const backgroundColor = '#f9fafb'; // A light gray
export const textColor = '#1f2937';
export const containerStyles = `
  background-color: ${backgroundColor};
  padding: 10px;
  font-family: Arial, sans-serif;
`;
export const cardStyles = `
  background-color: #ffffff;
  border-radius: 8px;
  padding: 30px;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
`;
export const headerStyles = `
  color: ${primaryColor};
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
`;
export const buttonStyles = `
  display: inline-block;
  background-color: ${primaryColor};
  color: #ffffff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 5px;
  font-size: 16px;
`;
export const paragraphStyles = `
  font-size: 16px;
  line-height: 1.5;
  color: ${textColor};
  margin-bottom: 20px;
`;

export const buttonContainerStyles = `
  text-align: center;
  margin: 25px 0;
`;

export const signatureStyles = `
  font-size: 14px;
  color: #6b7280;
  margin-top: 30px;
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
`;

export const qrCodeStyles = `
  text-align: center;
  margin: 20px 0;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
`;

// Responsive CSS block to be injected into templates' head
export const responsiveStyles = `
  <style type="text/css">
    /* Core classes used by templates */
    .email-container { width: 100%; }
    .email-card { max-width: 600px; margin: 0 auto; }

    /* Mobile adjustments: make the card nearly full-width and reduce outer padding */
    @media only screen and (max-width: 480px) {
      .email-container { padding: 4px !important; }
      .email-card { padding: 4px !important; margin: 0 4px !important; max-width: 100% !important; border-radius: 4px !important; }
      .email-card h1 { font-size: 20px !important; }
      img.qr { display: block; margin: 0 auto; max-width: 90% !important; height: auto !important; }
    }
  </style>
`;
// Export as styles object for template compatibility
export const styles = {
  container: containerStyles,
  card: cardStyles,
  heading: headerStyles,
  button: buttonStyles,
  paragraph: paragraphStyles,
  buttonContainer: buttonContainerStyles,
  signature: signatureStyles,
  qrCode: qrCodeStyles,
  responsive: responsiveStyles,
};
