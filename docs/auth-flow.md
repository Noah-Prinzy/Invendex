# Auth Flow

Current auth flow in Invendex:

1. A user signs up or signs in through the React auth experience.
2. The backend validates credentials and issues an access token plus refresh token.
3. The frontend stores session state and uses the access token for protected requests.
4. Refresh flows rotate access as needed.
5. Protected backend routes use `protect` middleware to validate access tokens and attach the current user.

Supported account paths visible in the codebase:

- Admin sign in
- Employee sign in
- Organization sign up
- Employee sign up / invite flow
- Email verification
- Password reset
- Two-factor setup and verification
- Session listing and remote session revocation

Behavioral guardrails:

- Optional email verification enforcement
- Role-based access checks for sensitive route groups
- Session and auth activity audit logging
- Background-job-based notification emails for security events

Frontend auth UX notes:

- The intro landing flow precedes the auth form
- The authenticated workspace persists theme choice and tutorial completion
- The auth form supports both admin and employee portals

Backend auth implementation anchors:

- `backend/src/controllers/authController.js`
- `backend/src/middlewares/authMiddleware.js`
- `backend/src/utils/token.js`

Follow-up documentation worth adding later:

- Refresh-token rotation sequence diagram
- 2FA recovery-code lifecycle
- Cookie versus bearer-token usage guidance
