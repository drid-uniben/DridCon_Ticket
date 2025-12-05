const generateSecurePassword = (length: number = 12): string => {
  const charset: string =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password: string = '';

  // Ensure at least one character from each character class
  password += charset.slice(0, 26).charAt(Math.floor(Math.random() * 26)); // lowercase
  password += charset.slice(26, 52).charAt(Math.floor(Math.random() * 26)); // uppercase
  password += charset.slice(52, 62).charAt(Math.floor(Math.random() * 10)); // number
  password += charset
    .slice(62)
    .charAt(Math.floor(Math.random() * (charset.length - 62))); // special

  // Fill the rest randomly
  const remainingLength: number = length - 4;
  for (let i: number = 0; i < remainingLength; i++) {
    const randomIndex: number = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

export default generateSecurePassword;
