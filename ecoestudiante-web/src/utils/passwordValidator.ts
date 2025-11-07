// utils/passwordValidator.ts
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  const validations = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  if (!validations.minLength) {
    errors.push('Al menos 8 caracteres');
  }
  if (!validations.hasUpperCase) {
    errors.push('Al menos una mayúscula');
  }
  if (!validations.hasLowerCase) {
    errors.push('Al menos una minúscula');
  }
  if (!validations.hasNumber) {
    errors.push('Al menos un número');
  }
  if (!validations.hasSymbol) {
    errors.push('Al menos un símbolo (!@#$%^&*...)');
  }

  const isValid = errors.length === 0;
  
  // Calcular fuerza
  const passedChecks = Object.values(validations).filter(Boolean).length;
  let strength: 'weak' | 'medium' | 'strong';
  if (passedChecks <= 2) {
    strength = 'weak';
  } else if (passedChecks <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { isValid, errors, strength };
}

