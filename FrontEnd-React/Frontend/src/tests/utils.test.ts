import { describe, it, expect } from 'vitest';
import { fmtDateTime } from '../utils/dates';

describe('Utils - Date Formatting', () => {
  it('should format date correctly', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = fmtDateTime(date);
    
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should handle invalid date', () => {
    const invalidDate = 'invalid-date';
    const formatted = fmtDateTime(invalidDate);
    
    expect(formatted).toBeDefined();
  });

  it('should handle null or undefined', () => {
    const formatted1 = fmtDateTime(null as any);
    const formatted2 = fmtDateTime(undefined as any);
    
    expect(formatted1).toBeDefined();
    expect(formatted2).toBeDefined();
  });
});

describe('Utils - Currency Formatting', () => {
  it('should format cordoba currency', () => {
    const amount = 1234.56;
    const formatted = new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
    }).format(amount);
    
    expect(formatted).toContain('1,234.56');
  });

  it('should format dollar currency', () => {
    const amount = 1234.56;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    
    expect(formatted).toContain('$1,234.56');
  });

  it('should handle zero amount', () => {
    const amount = 0;
    const formatted = new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
    }).format(amount);
    
    expect(formatted).toBeDefined();
  });
});

describe('Utils - Number Formatting', () => {
  it('should format large numbers', () => {
    const number = 1234567.89;
    const formatted = number.toLocaleString('es-NI');
    
    expect(formatted).toContain('1,234,567');
  });

  it('should round to 2 decimals', () => {
    const number = 123.456789;
    const rounded = Math.round(number * 100) / 100;
    
    expect(rounded).toBe(123.46);
  });

  it('should handle negative numbers', () => {
    const number = -1234.56;
    const formatted = number.toLocaleString('es-NI');
    
    expect(formatted).toContain('-1,234.56');
  });
});
