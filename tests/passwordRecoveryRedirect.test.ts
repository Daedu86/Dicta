import { describe, expect, it } from 'vitest';
import { buildPasswordRecoveryRedirectUrl } from '../src/app/passwordRecoveryRedirect';

describe('buildPasswordRecoveryRedirectUrl', () => {
  it('prefers the configured origin over the browser origin', () => {
    expect(buildPasswordRecoveryRedirectUrl({
      configuredOrigin: 'https://dicta.example.test',
      currentOrigin: 'https://preview.example.test',
    })).toBe('https://dicta.example.test/training');
  });

  it('normalizes a trailing slash on the configured origin', () => {
    expect(buildPasswordRecoveryRedirectUrl({
      configuredOrigin: 'https://dicta.example.test/',
      currentOrigin: 'https://preview.example.test',
    })).toBe('https://dicta.example.test/training');
  });

  it('falls back to the browser origin when no configured origin exists', () => {
    expect(buildPasswordRecoveryRedirectUrl({
      configuredOrigin: '',
      currentOrigin: 'http://localhost:5173',
    })).toBe('http://localhost:5173/training');
  });

  it('normalizes custom redirect paths', () => {
    expect(buildPasswordRecoveryRedirectUrl({
      configuredOrigin: 'https://dicta.example.test/',
      currentOrigin: 'https://preview.example.test',
      path: '///training',
    })).toBe('https://dicta.example.test/training');
  });
});
