import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from './password-strength-indicator';

describe('PasswordStrengthIndicator', () => {
  it('renders nothing while the field is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('names the first unmet rule instead of just calling the password weak', () => {
    render(<PasswordStrengthIndicator password="abc" />);

    expect(screen.getByText('Password strength')).toBeTruthy();
    expect(screen.getByText('Very weak')).toBeTruthy();
    expect(screen.getByText('Use at least 10 characters.')).toBeTruthy();
  });

  it('reports a top score for a strong password', () => {
    render(<PasswordStrengthIndicator password="Pharmacy#2024Stock" />);

    expect(screen.getByText('Strong')).toBeTruthy();
    // Nothing left to fix, so the guidance becomes confirmation.
    expect(screen.getByText('This password meets the requirements.')).toBeTruthy();
  });

  it('does not ask for a symbol the password already has', () => {
    render(<PasswordStrengthIndicator password="Pharmacy#2024" />);

    expect(screen.queryByText('Add a symbol for extra strength.')).toBeNull();
  });

  it('uses the person context to catch a name-based password', () => {
    render(<PasswordStrengthIndicator password="AdaezeSecure1" name="Adaeze Okafor" />);

    expect(
      screen.getByText('Do not use your name or email address in the password.'),
    ).toBeTruthy();
  });

  it('announces changes politely for screen readers', () => {
    const { container } = render(<PasswordStrengthIndicator password="abc" />);

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
