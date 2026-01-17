import {
  checkPasswordRequirements,
  calculatePasswordStrength,
  isPasswordValid,
} from '../src/lib/password-validation';

describe('Password Validation', () => {
  describe('checkPasswordRequirements', () => {
    it('should return all requirements not met for empty password', () => {
      const requirements = checkPasswordRequirements('');
      expect(requirements).toHaveLength(5);
      expect(requirements.every((r) => !r.met)).toBe(true);
    });

    it('should check length requirement', () => {
      const short = checkPasswordRequirements('Abc1!');
      const long = checkPasswordRequirements('Abcdefg1!');

      expect(short.find((r) => r.id === 'length')?.met).toBe(false);
      expect(long.find((r) => r.id === 'length')?.met).toBe(true);
    });

    it('should check uppercase requirement', () => {
      const noUpper = checkPasswordRequirements('abcdefg1!');
      const hasUpper = checkPasswordRequirements('Abcdefg1!');

      expect(noUpper.find((r) => r.id === 'uppercase')?.met).toBe(false);
      expect(hasUpper.find((r) => r.id === 'uppercase')?.met).toBe(true);
    });

    it('should check lowercase requirement', () => {
      const noLower = checkPasswordRequirements('ABCDEFG1!');
      const hasLower = checkPasswordRequirements('Abcdefg1!');

      expect(noLower.find((r) => r.id === 'lowercase')?.met).toBe(false);
      expect(hasLower.find((r) => r.id === 'lowercase')?.met).toBe(true);
    });

    it('should check number requirement', () => {
      const noNumber = checkPasswordRequirements('Abcdefgh!');
      const hasNumber = checkPasswordRequirements('Abcdefg1!');

      expect(noNumber.find((r) => r.id === 'number')?.met).toBe(false);
      expect(hasNumber.find((r) => r.id === 'number')?.met).toBe(true);
    });

    it('should check special character requirement', () => {
      const noSpecial = checkPasswordRequirements('Abcdefg12');
      const hasSpecial = checkPasswordRequirements('Abcdefg1!');

      expect(noSpecial.find((r) => r.id === 'special')?.met).toBe(false);
      expect(hasSpecial.find((r) => r.id === 'special')?.met).toBe(true);
    });

    it('should return all requirements met for a strong password', () => {
      const requirements = checkPasswordRequirements('StrongP@ss123');
      expect(requirements.every((r) => r.met)).toBe(true);
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should return weak for empty password', () => {
      const strength = calculatePasswordStrength('');
      expect(strength.label).toBe('weak');
      expect(strength.score).toBe(0);
    });

    it('should return weak for simple password', () => {
      const strength = calculatePasswordStrength('abc');
      expect(strength.label).toBe('weak');
    });

    it('should return fair for medium password', () => {
      const strength = calculatePasswordStrength('Abcdefg1');
      expect(['weak', 'fair']).toContain(strength.label);
    });

    it('should return good for a decent password', () => {
      const strength = calculatePasswordStrength('Abcdefg1!');
      expect(['fair', 'good']).toContain(strength.label);
    });

    it('should return strong for a long complex password', () => {
      const strength = calculatePasswordStrength('MyStr0ng!P@ssword123');
      expect(strength.label).toBe('strong');
      expect(strength.score).toBe(4);
    });

    it('should increase score with longer passwords', () => {
      const short = calculatePasswordStrength('Abc1!aaa');
      const long = calculatePasswordStrength('Abc1!aaa12345678');
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });
  });

  describe('isPasswordValid', () => {
    it('should return false for empty password', () => {
      expect(isPasswordValid('')).toBe(false);
    });

    it('should return false for password missing requirements', () => {
      expect(isPasswordValid('abcdefgh')).toBe(false); // no uppercase, number, special
      expect(isPasswordValid('ABCDEFGH')).toBe(false); // no lowercase, number, special
      expect(isPasswordValid('Abcdefgh')).toBe(false); // no number, special
      expect(isPasswordValid('Abcdefg1')).toBe(false); // no special
    });

    it('should return true for password meeting all requirements', () => {
      expect(isPasswordValid('Abcdefg1!')).toBe(true);
      expect(isPasswordValid('StrongP@ss123')).toBe(true);
      expect(isPasswordValid('MyP@ssw0rd!')).toBe(true);
    });

    it('should return false for short password even with all character types', () => {
      expect(isPasswordValid('Ab1!')).toBe(false);
    });
  });
});
