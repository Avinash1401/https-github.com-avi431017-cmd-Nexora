import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  evaluatePasswordStrength,
  validateRegistrationInputs,
  hasPermission,
} from './authValidation.ts';

test('Auth Validation - validateEmail accepts valid emails and rejects malformed', () => {
  assert.equal(validateEmail('trader@nexora.vip'), true);
  assert.equal(validateEmail('alex.vance+test@crypto.org'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('missing@domain'), false);
  assert.equal(validateEmail('@emptyuser.com'), false);
  assert.equal(validateEmail(''), false);
});

test('Auth Validation - evaluatePasswordStrength correctly rates complexity', () => {
  const weak = evaluatePasswordStrength('short');
  assert.equal(weak.score < 2, true);
  assert.equal(weak.hasMinLength, false);

  const strong = evaluatePasswordStrength('Nexora2026!Gold');
  assert.equal(strong.score, 4);
  assert.equal(strong.label, 'Strong');
  assert.equal(strong.hasUppercase, true);
  assert.equal(strong.hasNumber, true);
  assert.equal(strong.hasSpecialChar, true);
});

test('Auth Validation - validateRegistrationInputs rejects mismatched passwords', () => {
  const result = validateRegistrationInputs(
    'investor@nexora.vip',
    'Alex Vance',
    'Pass1234!',
    'DifferentPass1234!'
  );
  assert.equal(result.isValid, false);
  assert.match(result.error || '', /match/i);
});

test('Auth Validation - validateRegistrationInputs accepts valid inputs', () => {
  const result = validateRegistrationInputs(
    'investor@nexora.vip',
    'Alex Vance',
    'Pass1234!',
    'Pass1234!'
  );
  assert.equal(result.isValid, true);
});

test('Auth Validation - hasPermission enforces role-based restrictions', () => {
  assert.equal(hasPermission('admin', 'admin:all'), true);
  assert.equal(hasPermission('admin', 'audit:inspect'), true);
  assert.equal(hasPermission('miner', 'mining:mine'), true);
  assert.equal(hasPermission('miner', 'admin:all'), false);
  assert.equal(hasPermission('user', 'admin:all'), false);
  assert.equal(hasPermission('user', 'wallet:virtual_transfer'), true);
});
