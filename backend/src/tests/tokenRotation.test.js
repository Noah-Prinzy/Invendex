import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/token.js';

const ORIGINAL_ENV = {
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_SECRET_PREVIOUS: process.env.JWT_ACCESS_SECRET_PREVIOUS,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_SECRET_PREVIOUS: process.env.JWT_REFRESH_SECRET_PREVIOUS,
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES
};

const resetJwtEnv = () => {
  process.env.JWT_ACCESS_SECRET = ORIGINAL_ENV.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET_PREVIOUS =
    ORIGINAL_ENV.JWT_ACCESS_SECRET_PREVIOUS;
  process.env.JWT_ACCESS_EXPIRES = ORIGINAL_ENV.JWT_ACCESS_EXPIRES;
  process.env.JWT_REFRESH_SECRET = ORIGINAL_ENV.JWT_REFRESH_SECRET;
  process.env.JWT_REFRESH_SECRET_PREVIOUS =
    ORIGINAL_ENV.JWT_REFRESH_SECRET_PREVIOUS;
  process.env.JWT_REFRESH_EXPIRES = ORIGINAL_ENV.JWT_REFRESH_EXPIRES;
};

describe('token rotation verification', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'current_access_secret_value_12345';
    process.env.JWT_ACCESS_SECRET_PREVIOUS = '';
    process.env.JWT_ACCESS_EXPIRES = '15m';

    process.env.JWT_REFRESH_SECRET = 'current_refresh_secret_value_12345';
    process.env.JWT_REFRESH_SECRET_PREVIOUS = '';
    process.env.JWT_REFRESH_EXPIRES = '7d';
  });

  afterAll(() => {
    resetJwtEnv();
  });

  it('verifies access tokens signed with current secret', () => {
    const token = generateAccessToken({
      _id: '507f1f77bcf86cd799439011',
      role: 'admin',
      organization: '507f1f77bcf86cd799439012'
    });

    const decoded = verifyAccessToken(token);

    expect(decoded.id).toBe('507f1f77bcf86cd799439011');
    expect(decoded.role).toBe('admin');
  });

  it('verifies access tokens signed with previous secret', () => {
    process.env.JWT_ACCESS_SECRET_PREVIOUS = 'old_access_secret_value_12345';

    const legacyToken = jwt.sign(
      {
        id: '507f1f77bcf86cd799439013',
        role: 'staff',
        organization: '507f1f77bcf86cd799439012'
      },
      process.env.JWT_ACCESS_SECRET_PREVIOUS,
      { expiresIn: '15m' }
    );

    const decoded = verifyAccessToken(legacyToken);
    expect(decoded.id).toBe('507f1f77bcf86cd799439013');
    expect(decoded.role).toBe('staff');
  });

  it('rejects access tokens not signed by current or previous secrets', () => {
    process.env.JWT_ACCESS_SECRET_PREVIOUS = 'old_access_secret_value_12345';
    const invalidToken = jwt.sign(
      { id: '507f1f77bcf86cd799439099' },
      'some_other_access_secret_98765',
      { expiresIn: '15m' }
    );

    expect(() => verifyAccessToken(invalidToken)).toThrow();
  });

  it('verifies refresh tokens signed with previous secret', () => {
    process.env.JWT_REFRESH_SECRET_PREVIOUS = 'old_refresh_secret_value_12345';

    const legacyRefreshToken = jwt.sign(
      {
        id: '507f1f77bcf86cd799439014',
        tokenVersion: Date.now()
      },
      process.env.JWT_REFRESH_SECRET_PREVIOUS,
      { expiresIn: '7d' }
    );

    const decoded = verifyRefreshToken(legacyRefreshToken);
    expect(decoded.id).toBe('507f1f77bcf86cd799439014');
  });

  it('generates refresh token with current signing secret only', () => {
    process.env.JWT_REFRESH_SECRET_PREVIOUS = 'old_refresh_secret_value_12345';
    const refreshToken = generateRefreshToken({
      _id: '507f1f77bcf86cd799439015'
    });

    const decodedWithCurrent = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    expect(decodedWithCurrent.id).toBe('507f1f77bcf86cd799439015');
    expect(() =>
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_PREVIOUS)
    ).toThrow();
  });
});
