import { fireEvent, render, screen } from '@testing-library/react';
import { VerificationCodeInput } from './verification-code-input';

function boxes() {
  return screen.getAllByLabelText(/^Digit \d of 6$/);
}

describe('VerificationCodeInput', () => {
  it('renders exactly six labelled boxes', () => {
    render(<VerificationCodeInput value="" onChange={jest.fn()} />);

    expect(boxes()).toHaveLength(6);
    expect(boxes()[0]).toHaveAttribute('inputmode', 'numeric');
    // Only the first box offers the one-time-code autofill hint.
    expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(boxes()[1]).toHaveAttribute('autocomplete', 'off');
  });

  it('shows the digits of the current value', () => {
    render(<VerificationCodeInput value="123" onChange={jest.fn()} />);

    const inputs = boxes() as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['1', '2', '3', '', '', '']);
  });

  it('types a digit, reports it and advances the focus', () => {
    const onChange = jest.fn();
    render(<VerificationCodeInput value="" onChange={onChange} />);

    fireEvent.change(boxes()[0], { target: { value: '4' } });

    expect(onChange).toHaveBeenCalledWith('4');
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('ignores non-numeric characters', () => {
    const onChange = jest.fn();
    render(<VerificationCodeInput value="" onChange={onChange} />);

    fireEvent.change(boxes()[0], { target: { value: 'a' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('replaces the digit when typing into a filled box', () => {
    const onChange = jest.fn();
    render(<VerificationCodeInput value="123" onChange={onChange} />);

    fireEvent.change(boxes()[1], { target: { value: '9' } });

    expect(onChange).toHaveBeenCalledWith('193');
  });

  it('pastes a whole code and completes the field', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    render(<VerificationCodeInput value="" onChange={onChange} onComplete={onComplete} />);

    fireEvent.paste(boxes()[0], {
      clipboardData: { getData: () => ' 12-34 56 ' },
    });

    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not fire onComplete until six digits are present', () => {
    const onComplete = jest.fn();
    render(<VerificationCodeInput value="" onChange={jest.fn()} onComplete={onComplete} />);

    fireEvent.change(boxes()[0], { target: { value: '7' } });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('moves back on backspace and clears the previous digit', () => {
    const onChange = jest.fn();
    render(<VerificationCodeInput value="12" onChange={onChange} />);

    fireEvent.keyDown(boxes()[1], { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('moves to the previous box with the left arrow', () => {
    render(<VerificationCodeInput value="12" onChange={jest.fn()} />);

    boxes()[1].focus();
    fireEvent.keyDown(boxes()[1], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('disables every box and shows the error when invalid', () => {
    render(
      <VerificationCodeInput value="" onChange={jest.fn()} disabled invalid error="That code has expired." />,
    );

    const inputs = boxes() as HTMLInputElement[];
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(inputs.every((input) => input.getAttribute('aria-invalid') === 'true')).toBe(true);
    expect(screen.getByText('That code has expired.')).toBeTruthy();
  });

  it('autofocuses the first box on mount when asked', () => {
    render(<VerificationCodeInput value="" onChange={jest.fn()} autoFocus />);

    expect(document.activeElement).toBe(boxes()[0]);
  });
});
