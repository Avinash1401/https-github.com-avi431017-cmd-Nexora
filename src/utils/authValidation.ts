/**
 * Authentication and Role Authorization Validation Logic
 * Decoupled pure logic for unit testing and form validation
 */

export interface PasswordStrength {
  score: number; // 0 - 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Weak',
      hasMinLength: false,
      hasUppercase: false,
      hasNumber: false,
      hasSpecialChar: false,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasUppercase) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecialChar) score += 1;

  let label: PasswordStrength['label'] = 'Weak';
  if (score === 2) label = 'Fair';
  else if (score === 3) label = 'Good';
  else if (score >= 4) label = 'Strong';

  return {
    score,
    label,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
  };
}

export function validateRegistrationInputs(
  email: string,
  displayName: string,
  password: string,
  confirmPassword?: string
): { isValid: boolean; error?: string } {
  if (!validateEmail(email)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  if (!displayName || displayName.trim().length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters.' };
  }

  const strength = evaluatePasswordStrength(password);
  if (!strength.hasMinLength) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }

  return { isValid: true };
}

export function hasPermission(
  userRole: 'user' | 'miner' | 'admin',
  permission: 'mining:mine' | 'wallet:virtual_transfer' | 'portfolio:view' | 'admin:all' | 'audit:inspect'
): boolean {
  switch (userRole) {
    case 'admin':
      return true;
    case 'miner':
      return permission !== 'admin:all' && permission !== 'audit:inspect';
    case 'user':
    default:
      return permission === 'wallet:virtual_transfer' || permission === 'portfolio:view';
  }
}
