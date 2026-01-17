/**
 * Password validation utilities for real-time client-side feedback
 */

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
}

/**
 * Check password against individual requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number',
      met: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$%^&*...)',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];
}

/**
 * Calculate password strength based on met requirements
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'weak', color: 'bg-gray-200' };
  }

  const requirements = checkPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;

  // Additional entropy checks
  const hasLongPassword = password.length >= 12;
  const hasVeryLongPassword = password.length >= 16;
  const hasMultipleSpecial = (password.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g) || []).length >= 2;
  const hasMultipleNumbers = (password.match(/\d/g) || []).length >= 2;

  let score = metCount;
  if (hasLongPassword) score += 0.5;
  if (hasVeryLongPassword) score += 0.5;
  if (hasMultipleSpecial) score += 0.5;
  if (hasMultipleNumbers) score += 0.25;

  // Map to 0-4 scale
  const normalizedScore = Math.min(4, Math.round((score / 7) * 4));

  const strengthMap: Record<number, PasswordStrength> = {
    0: { score: 0, label: 'weak', color: 'bg-red-500' },
    1: { score: 1, label: 'weak', color: 'bg-red-500' },
    2: { score: 2, label: 'fair', color: 'bg-yellow-500' },
    3: { score: 3, label: 'good', color: 'bg-blue-500' },
    4: { score: 4, label: 'strong', color: 'bg-green-500' },
  };

  return strengthMap[normalizedScore];
}

/**
 * Check if all minimum requirements are met
 */
export function isPasswordValid(password: string): boolean {
  const requirements = checkPasswordRequirements(password);
  return requirements.every((r) => r.met);
}
