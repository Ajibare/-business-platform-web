import { formatCurrency, formatDate, formatDateTime, pluralise } from './format';

describe('formatCurrency', () => {
  it('formats Naira amounts with thousands separators', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.5');
  });

  it('returns a dash when the amount is not available', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatDate', () => {
  it('returns a dash for empty or invalid values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });
});

describe('pluralise', () => {
  it('uses the singular form for one item', () => {
    expect(pluralise(1, 'row')).toBe('1 row');
    expect(pluralise(2, 'row')).toBe('2 rows');
  });
});
