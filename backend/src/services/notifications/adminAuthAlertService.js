import User from '../../models/User.js';
import { logger } from '../../observability/logger.js';
import { queueEmailNotification } from './emailJobService.js';
import { sendBulkSms, sendBulkWhatsApp } from './smsService.js';
import {
  dedupeContacts,
  isValidEmailAddress,
  isValidMobileNumber,
  normalizeEmailAddress,
  normalizeMobileNumber
} from '../../utils/contactInfo.js';
import {
  buildEmployeeSignupEmailActionUrl,
  signEmployeeSignupEmailActionToken
} from '../../utils/employeeSignupEmailActions.js';

const ADMIN_ROLES = ['owner', 'admin'];
const APP_WEB_URL = String(process.env.APP_WEB_URL || '').trim();
const EVENT_CHANNEL_POLICY = {
  employee_signup_request: {
    email: true,
    sms: false,
    whatsapp: true
  },
  employee_signin: {
    email: false,
    sms: false,
    whatsapp: false
  },
  employee_signout: {
    email: false,
    sms: false,
    whatsapp: false
  }
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildAdminSignupRequestEmailHtml = ({
  title,
  message,
  organizationName,
  employeeEmail,
  employeeUsername,
  employeeRole,
  employeeMobileNumber,
  approveLink,
  declineLink
}) => {
  const detailRows = [
    ['Workspace', organizationName || 'n/a'],
    ['Employee email', employeeEmail || 'n/a'],
    ['Username', employeeUsername || 'n/a'],
    ['Requested role', employeeRole || 'n/a'],
    ['Mobile number', employeeMobileNumber || 'n/a']
  ]
    .map(
      ([label, value]) => `
        <div class="detail-row">
          <span class="detail-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
    )
    .join('');

  const appLinkMarkup = APP_WEB_URL
    ? `<a class="link-secondary" href="${escapeHtml(APP_WEB_URL)}">Open Invendex</a>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title || 'Invendex')}</title>
    <style>
      body {
        margin: 0;
        padding: 32px 16px;
        background:
          radial-gradient(circle at top, rgba(88, 179, 255, 0.24), transparent 36%),
          linear-gradient(180deg, #07111f 0%, #0d1727 54%, #111c2f 100%);
        color: #eff7ff;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .shell {
        max-width: 640px;
        margin: 0 auto;
      }
      .card {
        border-radius: 28px;
        padding: 32px;
        border: 1px solid rgba(174, 227, 255, 0.18);
        background: rgba(6, 16, 28, 0.88);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.3);
      }
      .eyebrow {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(174, 227, 255, 0.14);
        color: #aee3ff;
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      h1 {
        margin: 18px 0 12px;
        font-size: 30px;
        line-height: 1.12;
      }
      p {
        margin: 0;
        color: rgba(239, 247, 255, 0.84);
        line-height: 1.65;
        font-size: 15px;
      }
      .details {
        margin-top: 22px;
        padding: 18px;
        border-radius: 20px;
        background: rgba(174, 227, 255, 0.08);
        border: 1px solid rgba(174, 227, 255, 0.12);
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(174, 227, 255, 0.08);
      }
      .detail-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .detail-label {
        color: rgba(239, 247, 255, 0.6);
      }
      .actions {
        margin-top: 24px;
      }
      .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 14px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 184px;
        padding: 14px 18px;
        border-radius: 16px;
        color: #04111f !important;
        font-weight: 700;
        text-decoration: none;
        background: linear-gradient(135deg, #aee3ff 0%, #63b6ff 100%);
      }
      .button.button-danger {
        background: linear-gradient(135deg, #ffc4c4 0%, #ff8383 100%);
      }
      .link-secondary {
        display: inline-flex;
        margin-top: 16px;
        color: #aee3ff !important;
        text-decoration: none;
        font-weight: 600;
      }
      .footnote {
        margin-top: 22px;
        color: rgba(239, 247, 255, 0.56);
        font-size: 12px;
        line-height: 1.6;
      }
      @media (max-width: 640px) {
        .card {
          padding: 24px;
        }
        .detail-row {
          flex-direction: column;
          gap: 6px;
        }
        .button {
          width: 100%;
          min-width: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <span class="eyebrow">Invendex admin review</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <div class="details">
          ${detailRows}
        </div>
        <div class="actions">
          <p>Review directly from this email:</p>
          <div class="button-row">
            <a class="button" href="${escapeHtml(approveLink)}">Approve request</a>
            <a class="button button-danger" href="${escapeHtml(declineLink)}">Decline request</a>
          </div>
          ${appLinkMarkup}
        </div>
        <div class="footnote">
          These links are signed and time-limited. If one no longer works, open Invendex and review the request from the notification panel.
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const buildEventCopy = ({
  eventType,
  organizationName,
  employeeEmail,
  employeeUsername
}) => {
  const identity = employeeUsername || employeeEmail || 'Employee';
  const workspace = organizationName || 'organization';

  if (eventType === 'employee_signup_request') {
    return {
      subject: `Invendex employee signup request (${workspace})`,
      title: 'Employee signup request',
      message: `${identity} requested access to ${workspace}.`
    };
  }

  if (eventType === 'employee_signout') {
    return {
      subject: `Invendex employee sign out (${workspace})`,
      title: 'Employee signed out',
      message: `${identity} signed out of ${workspace}.`
    };
  }

  return {
    subject: `Invendex employee sign in (${workspace})`,
    title: 'Employee signed in',
    message: `${identity} signed in to ${workspace}.`
  };
};

export const notifyAdminsOfEmployeeAuthEvent = async ({
  organizationId,
  actorUserId = null,
  eventType,
  organizationName = 'Organization',
  signupRequestId = '',
  publicApiBaseUrl = '',
  employeeEmail = '',
  employeeUsername = '',
  employeeRole = '',
  employeeMobileNumber = ''
}) => {
  try {
    if (!organizationId || !eventType) {
      return {
        queued: false,
        skipped: true,
        reason: 'organizationId and eventType are required'
      };
    }

    const policy = EVENT_CHANNEL_POLICY[eventType] || {
      email: false,
      sms: false,
      whatsapp: false
    };

    if (!policy.email && !policy.sms && !policy.whatsapp) {
      return {
        queued: false,
        skipped: true,
        reason: 'event_policy_in_app_only',
        policy
      };
    }

    const adminUsers = await User.find({
      organization: organizationId,
      role: { $in: ADMIN_ROLES },
      isActive: true
    })
      .select('_id email mobileNumber')
      .lean();

    const emailTargets = policy.email
      ? adminUsers.reduce((accumulator, user) => {
          const normalizedEmail = isValidEmailAddress(user?.email)
            ? normalizeEmailAddress(user.email)
            : '';
          if (
            !normalizedEmail ||
            accumulator.some((entry) => entry.email === normalizedEmail)
          ) {
            return accumulator;
          }

          accumulator.push({
            email: normalizedEmail,
            reviewerUserId: user?._id ? String(user._id) : ''
          });
          return accumulator;
        }, [])
      : [];
    const emailRecipients = emailTargets.map((entry) => entry.email);
    const mobileRecipients =
      policy.sms || policy.whatsapp
        ? dedupeContacts(
            adminUsers
              .map((user) => user?.mobileNumber)
              .filter((mobileNumber) => isValidMobileNumber(mobileNumber)),
            normalizeMobileNumber
          )
        : [];

    if (!emailRecipients.length && !mobileRecipients.length) {
      return {
        queued: false,
        skipped: true,
        reason: 'No admin contacts available',
        policy
      };
    }

    const copy = buildEventCopy({
      eventType,
      organizationName,
      employeeEmail,
      employeeUsername
    });

    const emailText = [
      copy.message,
      '',
      `Employee email: ${employeeEmail || 'n/a'}`,
      `Employee username: ${employeeUsername || 'n/a'}`,
      `Employee role: ${employeeRole || 'n/a'}`,
      `Employee mobile: ${employeeMobileNumber || 'n/a'}`
    ].join('\n');

    const smsText = [
      copy.title,
      copy.message,
      employeeRole ? `Role: ${employeeRole}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const emailJobs = policy.email
      ? await Promise.all(
          emailTargets.map(({ email: recipient, reviewerUserId }) => {
            const emailActionLinks =
              eventType === 'employee_signup_request' &&
              publicApiBaseUrl &&
              signupRequestId &&
              reviewerUserId
                ? (() => {
                    const approveLink = buildEmployeeSignupEmailActionUrl({
                      baseUrl: publicApiBaseUrl,
                      token: signEmployeeSignupEmailActionToken({
                        organizationId,
                        signupRequestId,
                        reviewerUserId,
                        action: 'approve'
                      })
                    });
                    const declineLink = buildEmployeeSignupEmailActionUrl({
                      baseUrl: publicApiBaseUrl,
                      token: signEmployeeSignupEmailActionToken({
                        organizationId,
                        signupRequestId,
                        reviewerUserId,
                        action: 'decline'
                      })
                    });

                    return { approveLink, declineLink };
                  })()
                : null;

            const emailActionLines = emailActionLinks
              ? [
                  '',
                  'Approve request:',
                  emailActionLinks.approveLink,
                  '',
                  'Decline request:',
                  emailActionLinks.declineLink,
                  '',
                  'These links are signed and time-limited.'
                ].join('\n')
              : '';

            const emailHtml =
              emailActionLinks && eventType === 'employee_signup_request'
                ? buildAdminSignupRequestEmailHtml({
                    title: copy.title,
                    message: copy.message,
                    organizationName,
                    employeeEmail,
                    employeeUsername,
                    employeeRole,
                    employeeMobileNumber,
                    approveLink: emailActionLinks.approveLink,
                    declineLink: emailActionLinks.declineLink
                  })
                : null;

            return queueEmailNotification({
              organizationId,
              createdBy: actorUserId,
              to: recipient,
              subject: copy.subject,
              text: `${emailText}${emailActionLines}`,
              html: emailHtml,
              notificationType: eventType.toUpperCase(),
              metadata: {
                eventType,
                signupRequestId: signupRequestId || null,
                employeeEmail: employeeEmail || null,
                employeeUsername: employeeUsername || null,
                employeeRole: employeeRole || null,
                employeeMobileNumber: employeeMobileNumber || null,
                organizationName
              }
            }).catch((error) => {
              logger.warn('admin_auth_email_alert_failed', {
                organizationId: String(organizationId),
                recipient,
                eventType,
                err: error
              });
              return {
                queued: false,
                skipped: false,
                reason: String(error?.message || 'email_failed')
              };
            });
          })
        )
      : [];

    let smsResult = {
      count: 0,
      deliveredCount: 0,
      results: []
    };
    let whatsappResult = {
      count: 0,
      deliveredCount: 0,
      results: []
    };

    if (mobileRecipients.length) {
      if (policy.sms) {
        try {
          smsResult = await sendBulkSms({
            recipients: mobileRecipients,
            message: smsText
          });
        } catch (error) {
          logger.warn('admin_auth_sms_alert_failed', {
            organizationId: String(organizationId),
            eventType,
            err: error
          });
        }
      }

      if (policy.whatsapp) {
        try {
          whatsappResult = await sendBulkWhatsApp({
            recipients: mobileRecipients,
            message: smsText
          });
        } catch (error) {
          logger.warn('admin_auth_whatsapp_alert_failed', {
            organizationId: String(organizationId),
            eventType,
            err: error
          });
        }
      }
    }

    return {
      queued: true,
      policy,
      emailRecipients,
      mobileRecipients,
      emailJobs,
      smsResult,
      whatsappResult
    };
  } catch (error) {
    logger.warn('admin_auth_alert_failed', {
      organizationId: String(organizationId || ''),
      eventType,
      err: error
    });
    return {
      queued: false,
      skipped: false,
      reason: String(error?.message || 'admin_auth_alert_failed')
    };
  }
};

export default {
  notifyAdminsOfEmployeeAuthEvent
};
