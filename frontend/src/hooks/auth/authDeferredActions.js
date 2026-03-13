import {
  authEmployeeSignupRequest,
  authApproveEmployeeSignupRequest,
  authDeclineEmployeeSignupRequest,
  authRegisterRequest,
  authVerifyEmailRequest,
  authVerifyEmailConfirmRequest,
  authForgotPasswordRequest,
  authResetPasswordRequest,
  authTwoFactorVerifyLoginRequest,
  authUpdatePreferencesRequest
} from '../../api/authClient.js';

export const verifyTwoFactorLoginAction = async ({
  pendingTwoFactorLogin,
  code = '',
  recoveryCode = '',
  applyAuthState,
  setPendingTwoFactorLogin,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const twoFactorToken = String(
    pendingTwoFactorLogin?.twoFactorToken || ''
  ).trim();
  if (!twoFactorToken) {
    return {
      success: false,
      message: 'No active two-factor login challenge'
    };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    const response = await authTwoFactorVerifyLoginRequest({
      twoFactorToken,
      code: String(code || '').trim(),
      recoveryCode: String(recoveryCode || '').trim()
    });

    const token = response?.data?.accessToken || '';
    const resolvedUser = response?.data?.user || null;
    if (!token || !resolvedUser) {
      throw new Error('Two-factor verification response missing auth data.');
    }

    applyAuthState({
      token,
      resolvedUser,
      organization: response?.data?.organization || null
    });
    setPendingTwoFactorLogin(null);
    setNotice('Two-factor verification complete.');
    return { success: true };
  } catch (verificationError) {
    const message = getMessage(verificationError);
    setError(message);
    return { success: false, message };
  } finally {
    setIsLoading(false);
  }
};

export const signupAction = async ({
  username,
  email,
  mobileNumber,
  password,
  confirmPassword,
  organizationName,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = String(email || '').trim();
  const normalizedMobileNumber = String(mobileNumber || '').trim();
  const normalizedPassword = String(password || '').trim();
  const normalizedConfirmPassword = String(confirmPassword || '').trim();
  const normalizedOrganizationName = String(organizationName || '').trim();

  if (
    !normalizedUsername ||
    !normalizedEmail ||
    !normalizedMobileNumber ||
    !normalizedPassword ||
    !normalizedConfirmPassword ||
    !normalizedOrganizationName
  ) {
    setError(
      'Username, email, mobile number, password, confirm password, and organization are required.'
    );
    setNotice('');
    return { success: false };
  }

  if (normalizedPassword !== normalizedConfirmPassword) {
    setError('Password and confirm password do not match.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    await authRegisterRequest({
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNumber: normalizedMobileNumber,
      password: normalizedPassword,
      confirmPassword: normalizedConfirmPassword,
      organizationName: normalizedOrganizationName
    });

    setNotice('Account created successfully. Sign in to continue.');
    return { success: true };
  } catch (registerError) {
    setError(getMessage(registerError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const employeeSignupAction = async ({
  companyName,
  username,
  email,
  mobileNumber,
  password,
  confirmPassword,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedCompanyName = String(companyName || '').trim();
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = String(email || '').trim();
  const normalizedMobileNumber = String(mobileNumber || '').trim();
  const normalizedPassword = String(password || '').trim();
  const normalizedConfirmPassword = String(confirmPassword || '').trim();

  if (
    !normalizedCompanyName ||
    !normalizedUsername ||
    !normalizedEmail ||
    !normalizedMobileNumber ||
    !normalizedPassword ||
    !normalizedConfirmPassword
  ) {
    setError(
      'Company, username, email, mobile number, password, and confirm password are required.'
    );
    setNotice('');
    return { success: false };
  }

  if (normalizedPassword !== normalizedConfirmPassword) {
    setError('Password and confirm password do not match.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    const response = await authEmployeeSignupRequest({
      companyName: normalizedCompanyName,
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNumber: normalizedMobileNumber,
      password: normalizedPassword,
      confirmPassword: normalizedConfirmPassword
    });

    setNotice(
      String(
        response?.message ||
          'Signup request submitted. Wait for admin approval.'
      )
    );
    return {
      success: true,
      data: response?.data || null
    };
  } catch (signupError) {
    setError(getMessage(signupError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const reviewEmployeeSignupRequestAction = async ({
  accessToken,
  requestId,
  decision = 'approve',
  reason = '',
  getMessage
}) => {
  if (!accessToken) {
    return { success: false, message: 'Not authenticated' };
  }

  const normalizedRequestId = String(requestId || '').trim();
  if (!normalizedRequestId) {
    return { success: false, message: 'requestId is required' };
  }

  const normalizedDecision = String(decision || '')
    .trim()
    .toLowerCase();
  const decisionRequest =
    normalizedDecision === 'decline'
      ? authDeclineEmployeeSignupRequest
      : authApproveEmployeeSignupRequest;

  try {
    const data = await decisionRequest({
      accessToken,
      requestId: normalizedRequestId,
      reason
    });
    return { success: true, data };
  } catch (reviewError) {
    return { success: false, message: getMessage(reviewError) };
  }
};

export const requestEmailVerificationAction = async ({
  email,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    setError('Email is required.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    const response = await authVerifyEmailRequest({ email: normalizedEmail });
    const debugToken = response?.data?.debugToken || '';
    const tokenSuffix = debugToken ? ` Token: ${debugToken}` : '';
    setNotice(`Verification request accepted.${tokenSuffix}`);
    return { success: true, debugToken };
  } catch (verificationError) {
    setError(getMessage(verificationError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const verifyEmailAction = async ({
  email,
  token,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedEmail = String(email || '').trim();
  const normalizedToken = String(token || '').trim();
  if (!normalizedEmail || !normalizedToken) {
    setError('Email and verification token are required.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    await authVerifyEmailConfirmRequest({
      email: normalizedEmail,
      token: normalizedToken
    });
    setNotice('Email verified. You can now sign in.');
    return { success: true };
  } catch (verificationError) {
    setError(getMessage(verificationError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const requestPasswordResetAction = async ({
  email,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    setError('Email is required.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    const response = await authForgotPasswordRequest({
      email: normalizedEmail
    });
    const debugToken = response?.data?.debugToken || '';
    const tokenSuffix = debugToken ? ` Token: ${debugToken}` : '';
    setNotice(`Password reset token generated.${tokenSuffix}`);
    return { success: true, debugToken };
  } catch (resetError) {
    setError(getMessage(resetError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const resetPasswordAction = async ({
  email,
  token,
  password,
  confirmPassword,
  setError,
  setNotice,
  setIsLoading,
  getMessage
}) => {
  const normalizedEmail = String(email || '').trim();
  const normalizedToken = String(token || '').trim();
  const normalizedPassword = String(password || '').trim();
  const normalizedConfirmPassword = String(confirmPassword || '').trim();

  if (
    !normalizedEmail ||
    !normalizedToken ||
    !normalizedPassword ||
    !normalizedConfirmPassword
  ) {
    setError('Email, token, password, and confirm password are required.');
    setNotice('');
    return { success: false };
  }

  if (normalizedPassword !== normalizedConfirmPassword) {
    setError('Password and confirm password do not match.');
    setNotice('');
    return { success: false };
  }

  setError('');
  setNotice('');
  setIsLoading(true);

  try {
    await authResetPasswordRequest({
      email: normalizedEmail,
      token: normalizedToken,
      password: normalizedPassword,
      confirmPassword: normalizedConfirmPassword
    });
    setNotice('Password reset successful. Sign in with your new password.');
    return { success: true };
  } catch (resetError) {
    setError(getMessage(resetError));
    return { success: false };
  } finally {
    setIsLoading(false);
  }
};

export const updatePreferencesAction = async ({
  accessToken,
  uiTheme,
  mobileNumber,
  normalizeUser,
  setUser,
  getMessage
}) => {
  const normalizedTheme = String(uiTheme || '').trim();
  const hasTheme = Boolean(normalizedTheme);
  const hasMobileNumber = mobileNumber !== undefined;
  if ((!hasTheme && !hasMobileNumber) || !accessToken) {
    return { success: false };
  }

  try {
    const response = await authUpdatePreferencesRequest({
      accessToken,
      ...(hasTheme ? { uiTheme: normalizedTheme } : {}),
      ...(hasMobileNumber
        ? {
            mobileNumber: String(mobileNumber || '').trim()
          }
        : {})
    });
    const updatedUser = normalizeUser(
      response?.data || null,
      response?.data?.organization || null
    );
    if (updatedUser) {
      setUser(updatedUser);
    }
    return { success: true, user: updatedUser };
  } catch (prefError) {
    return {
      success: false,
      message: getMessage(prefError)
    };
  }
};
