'use client';

import { useMemo } from 'react';
import {
  checkPasswordRequirements,
  calculatePasswordStrength,
  PasswordRequirement,
  PasswordStrength,
} from '@/lib/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const requirements: PasswordRequirement[] = useMemo(
    () => checkPasswordRequirements(password),
    [password]
  );

  const strength: PasswordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2 space-y-3" role="region" aria-label="Password strength indicator">
      {/* Strength meter */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Password strength</span>
          <span
            className={`font-medium capitalize ${
              strength.label === 'weak'
                ? 'text-red-600'
                : strength.label === 'fair'
                ? 'text-yellow-600'
                : strength.label === 'good'
                ? 'text-blue-600'
                : 'text-green-600'
            }`}
            aria-live="polite"
          >
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="space-y-1 text-sm" aria-label="Password requirements">
          {requirements.map((req) => (
            <li
              key={req.id}
              className={`flex items-center gap-2 ${
                req.met ? 'text-green-600' : 'text-gray-500'
              }`}
              aria-label={`${req.label}: ${req.met ? 'met' : 'not met'}`}
            >
              {req.met ? (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
              )}
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
