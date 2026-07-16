export const checkPasswordStrength = (pwd: string): number => {
  let strength = 0;
  if (!pwd) return 0;
  if (pwd.length >= 6) strength += 20;
  if (pwd.length >= 8) strength += 20;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20;
  if (/[0-9]/.test(pwd)) strength += 20;
  if (/[^a-zA-Z0-9]/.test(pwd)) strength += 20;
  return Math.min(strength, 100);
};

export const getPasswordStrengthColor = (strength: number): "error" | "warning" | "success" | "inherit" | "primary" | "secondary" | "info" => {
  if (strength < 50) return 'error';
  if (strength < 80) return 'warning';
  return 'success';
};

export const getPasswordStrengthLabel = (strength: number): string => {
  if (strength === 0) return '';
  if (strength < 50) return 'Fraca';
  if (strength < 80) return 'Média';
  return 'Forte';
};
