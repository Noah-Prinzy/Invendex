import User from '../../models/User.js';
import { logger } from '../../observability/logger.js';
import { sendBulkSms, sendBulkWhatsApp } from './smsService.js';
import {
  dedupeContacts,
  isValidMobileNumber,
  normalizeMobileNumber
} from '../../utils/contactInfo.js';

const ADMIN_ROLES = ['owner', 'admin'];
const EVENT_CHANNEL_POLICY = {
  employee_signup_request: {
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
  actorUserId: _actorUserId = null,
  eventType,
  organizationName = 'Organization',
  employeeEmail = '',
  employeeUsername = '',
  employeeRole = '',
  employeeMobileNumber: _employeeMobileNumber = ''
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
      sms: false,
      whatsapp: false
    };

    if (!policy.sms && !policy.whatsapp) {
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
      .select('_id mobileNumber')
      .lean();

    const mobileRecipients =
      policy.sms || policy.whatsapp
        ? dedupeContacts(
            adminUsers
              .map((user) => user?.mobileNumber)
              .filter((mobileNumber) => isValidMobileNumber(mobileNumber)),
            normalizeMobileNumber
          )
        : [];

    if (!mobileRecipients.length) {
      return {
        queued: false,
        skipped: true,
        reason: 'No admin mobile contacts available',
        policy
      };
    }

    const copy = buildEventCopy({
      eventType,
      organizationName,
      employeeEmail,
      employeeUsername
    });

    const smsText = [
      copy.title,
      copy.message,
      employeeRole ? `Role: ${employeeRole}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

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
      mobileRecipients,
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
