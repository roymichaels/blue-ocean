export interface ValidationRule {
  required?: string | boolean;
  pattern?: {
    value: RegExp;
    message?: string;
  };
}

export function validate(value: string, rules: ValidationRule): string | null {
  if (rules.required && !value.trim()) {
    return typeof rules.required === 'string' ? rules.required : 'Required';
  }
  if (rules.pattern && !rules.pattern.value.test(value)) {
    return rules.pattern.message || 'Invalid format';
  }
  return null;
}

export function validateAll(
  fields: Record<string, { value: string; rules: ValidationRule }>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(fields)) {
    const error = validate(fields[key].value, fields[key].rules);
    if (error) {
      errors[key] = error;
    }
  }
  return errors;
}
