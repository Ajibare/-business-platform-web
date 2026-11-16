import { SESSION_HINT_COOKIE, clearSessionHint, hasSessionHint, markSessionActive } from './session-hint';

function resetCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

describe('session hint', () => {
  beforeEach(() => {
    resetCookies();
  });

  it('is absent before anything has happened', () => {
    expect(hasSessionHint()).toBe(false);
  });

  it('is present once a session was received', () => {
    markSessionActive();

    expect(hasSessionHint()).toBe(true);
    expect(document.cookie).toContain(`${SESSION_HINT_COOKIE}=1`);
  });

  it('is gone after sign-out', () => {
    markSessionActive();
    clearSessionHint();

    expect(hasSessionHint()).toBe(false);
  });

  it('ignores a value that is not the expected flag', () => {
    document.cookie = `${SESSION_HINT_COOKIE}=yes; Path=/`;

    // The hint is compared exactly, so a stray cookie from another app or an
    // older version cannot be read as a session.
    expect(hasSessionHint()).toBe(false);
  });

  it('clearing an absent hint is harmless', () => {
    expect(() => clearSessionHint()).not.toThrow();
  });
});
