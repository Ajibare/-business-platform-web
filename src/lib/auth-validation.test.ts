import {
  PASSWORD_MIN_LENGTH,
  assessPassword,
  isValidEmail,
  isValidNigerianPhone,
  normalizePhone,
  parseOptionalMinimum,
  registerSchema,
  signInSchema,
  stockSettingsSchema,
} from './auth-validation';

describe('normalizePhone', () => {
  // These four shapes are what staff actually type; the API accepts all of
  // them, so the form must not reject a number the server would take.
  it.each([
    ['08031234567', '+2348031234567'],
    ['8031234567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
    ['2348031234567', '+2348031234567'],
    ['0803 123 4567', '+2348031234567'],
    ['(0803) 123-4567', '+2348031234567'],
    ['07061234567', '+2347061234567'],
    ['09091234567', '+2349091234567'],
    ['08181234567', '+2348181234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ['0123456789', 'does not start with a mobile prefix'],
    ['0803123456', 'national number is one digit short'],
    ['080312345678', 'national number is one digit long'],
    ['06031234567', 'prefix is not 070/080/081/090'],
    ['+447700900123', 'is not a Nigerian number'],
    ['0803 123 456', 'is incomplete'],
    ['', 'is empty'],
    ['not a number', 'is not numeric'],
  ])('rejects %s because it %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
    expect(isValidNigerianPhone(input)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('owner@pharmacy.com')).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(isValidEmail('  owner@pharmacy.com  ')).toBe(true);
  });

  it.each(['owner', 'owner@pharmacy', 'owner @pharmacy.com', '@pharmacy.com'])(
    'rejects %s',
    (input) => {
      expect(isValidEmail(input)).toBe(false);
    },
  );
});

describe('assessPassword', () => {
  it('flags a password that is too short and missing character classes', () => {
    const assessment = assessPassword('abc');

    expect(assessment.valid).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
        'Include an uppercase letter.',
        'Include a number.',
      ]),
    );
    expect(assessment.score).toBeLessThanOrEqual(1);
  });

  it('rejects a password from the common-password list', () => {
    const assessment = assessPassword('password123');

    expect(assessment.valid).toBe(false);
    expect(assessment.issues).toContain('This password is too common. Choose something unique.');
  });

  it('rejects a password containing the person name', () => {
    const assessment = assessPassword('AdaezeSecure1', { name: 'Adaeze Okafor' });

    expect(assessment.valid).toBe(false);
    expect(assessment.issues).toContain('Do not use your name or email address in the password.');
  });

  it('rejects a password containing the email local part', () => {
    const assessment = assessPassword('Pharmacyowner99', { email: 'pharmacyowner@example.com' });

    expect(assessment.valid).toBe(false);
    expect(assessment.issues).toContain('Do not use your name or email address in the password.');
  });

  it('accepts a strong password and reports the top score', () => {
    const assessment = assessPassword('Pharmacy#2024Stock');

    expect(assessment.valid).toBe(true);
    expect(assessment.issues).toEqual([]);
    expect(assessment.score).toBe(4);
    expect(assessment.label).toBe('Strong');
  });

  it('suggests a symbol when the password has none', () => {
    const assessment = assessPassword('Pharmacy2024Stock');

    expect(assessment.valid).toBe(true);
    expect(assessment.suggestions).toContain('Add a symbol for extra strength.');
  });

  it('stops suggesting changes once nothing is missing', () => {
    const assessment = assessPassword('Pharmacy#2024Stock');

    expect(assessment.suggestions).toEqual([]);
  });
});

describe('parseOptionalMinimum', () => {
  it('treats blank input as "not configured" rather than zero', () => {
    expect(parseOptionalMinimum('')).toBeNull();
    expect(parseOptionalMinimum('   ')).toBeNull();
  });

  it('keeps a genuine zero', () => {
    expect(parseOptionalMinimum('0')).toBe(0);
  });

  it('parses a positive threshold', () => {
    expect(parseOptionalMinimum('12')).toBe(12);
    expect(parseOptionalMinimum(' 25 ')).toBe(25);
  });

  it.each(['abc', '-1', 'NaN', 'Infinity'])('rejects %s', (input) => {
    expect(parseOptionalMinimum(input)).toBe('invalid');
  });
});

describe('signInSchema', () => {
  it('accepts an email address', () => {
    expect(signInSchema.safeParse({ identifier: 'owner@pharmacy.com', password: 'x' }).success).toBe(
      true,
    );
  });

  it('accepts a phone number in any supported shape', () => {
    expect(signInSchema.safeParse({ identifier: '0803 123 4567', password: 'x' }).success).toBe(
      true,
    );
    expect(signInSchema.safeParse({ identifier: '+2348031234567', password: 'x' }).success).toBe(
      true,
    );
  });

  it('rejects an identifier that is neither an email nor a phone number', () => {
    const result = signInSchema.safeParse({ identifier: '0123456789', password: 'x' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['identifier']);
    }
  });

  it('requires a password', () => {
    const result = signInSchema.safeParse({ identifier: 'owner@pharmacy.com', password: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['password']);
    }
  });
});

describe('registerSchema', () => {
  const validValues = {
    name: 'Ada Obi',
    email: 'ada@pharmacy.com',
    phone: '08031234567',
    password: 'Pharmacy#2024Stock',
    confirmPassword: 'Pharmacy#2024Stock',
    termsAccepted: true,
  };

  it('accepts a complete, strong registration', () => {
    expect(registerSchema.safeParse(validValues).success).toBe(true);
  });

  it('requires the terms checkbox', () => {
    const result = registerSchema.safeParse({ ...validValues, termsAccepted: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('termsAccepted');
    }
  });

  it('requires the two passwords to match', () => {
    const result = registerSchema.safeParse({ ...validValues, confirmPassword: 'Different#2024' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('confirmPassword');
    }
  });

  it('reports the first unmet password rule', () => {
    const result = registerSchema.safeParse({
      ...validValues,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((issue) => issue.path[0] === 'password');
      expect(passwordIssue?.message).toBe(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
    }
  });

  it('rejects a password built from the person name', () => {
    const result = registerSchema.safeParse({
      ...validValues,
      name: 'Ada Obi',
      password: 'AdaObiSecure1',
      confirmPassword: 'AdaObiSecure1',
    });

    expect(result.success).toBe(false);
  });

  it('allows an absent optional phone but rejects a malformed one', () => {
    const withoutPhone = { ...validValues, phone: '' };
    expect(registerSchema.safeParse(withoutPhone).success).toBe(true);

    const badPhone = registerSchema.safeParse({ ...validValues, phone: '0123456789' });
    expect(badPhone.success).toBe(false);
    if (!badPhone.success) {
      expect(badPhone.error.issues.map((issue) => issue.path.join('.'))).toContain('phone');
    }
  });
});

describe('stockSettingsSchema', () => {
  it('accepts a whole number of warning days', () => {
    expect(stockSettingsSchema.safeParse({ nearExpiryWarningDays: 90 }).success).toBe(true);
    expect(stockSettingsSchema.safeParse({ nearExpiryWarningDays: '30' }).success).toBe(true);
  });

  it('rejects a window shorter than a day or longer than a year', () => {
    expect(stockSettingsSchema.safeParse({ nearExpiryWarningDays: 0 }).success).toBe(false);
    expect(stockSettingsSchema.safeParse({ nearExpiryWarningDays: 366 }).success).toBe(false);
  });
});
