import Organization from '../../models/Organization.js';
import OrganizationSettings from '../../models/OrganizationSettings.js';
import User from '../../models/User.js';
import {
  dedupeContacts,
  isValidEmailAddress,
  isValidMobileNumber,
  normalizeEmailAddress,
  normalizeMobileNumber
} from '../../utils/contactInfo.js';

export const getOrganizationLowStockNotificationRecipients = async ({
  organizationId
}) => {
  const [organization, settings, users] = await Promise.all([
    Organization.findById(organizationId)
      .select(
        'name smsLowStockEnabled smsLowStockRecipients whatsappLowStockEnabled whatsappLowStockRecipients'
      )
      .lean(),
    OrganizationSettings.findOne({
      organization: organizationId
    })
      .select(
        'notifications.lowStockEmailEnabled notifications.lowStockRecipients'
      )
      .lean(),
    User.find({
      organization: organizationId,
      isActive: true
    })
      .select('email mobileNumber')
      .lean()
  ]);

  const userEmailRecipients = dedupeContacts(
    (users || [])
      .map((user) => user?.email)
      .filter((email) => isValidEmailAddress(email)),
    normalizeEmailAddress
  );

  const userPhoneRecipients = dedupeContacts(
    (users || [])
      .map((user) => user?.mobileNumber)
      .filter((mobileNumber) => isValidMobileNumber(mobileNumber)),
    normalizeMobileNumber
  );

  const legacyEmailRecipients = dedupeContacts(
    settings?.notifications?.lowStockRecipients || [],
    normalizeEmailAddress
  ).filter((email) => isValidEmailAddress(email));

  const legacySmsRecipients = dedupeContacts(
    organization?.smsLowStockRecipients || [],
    normalizeMobileNumber
  ).filter((mobileNumber) => isValidMobileNumber(mobileNumber));

  const legacyWhatsappRecipients = dedupeContacts(
    organization?.whatsappLowStockRecipients || [],
    normalizeMobileNumber
  ).filter((mobileNumber) => isValidMobileNumber(mobileNumber));

  return {
    organizationName: organization?.name || 'Organization',
    emailEnabled: Boolean(settings?.notifications?.lowStockEmailEnabled),
    smsEnabled: Boolean(organization?.smsLowStockEnabled),
    whatsappEnabled: Boolean(organization?.whatsappLowStockEnabled),
    emailRecipients: dedupeContacts(
      [...userEmailRecipients, ...legacyEmailRecipients],
      normalizeEmailAddress
    ),
    smsRecipients: dedupeContacts(
      [...userPhoneRecipients, ...legacySmsRecipients],
      normalizeMobileNumber
    ),
    whatsappRecipients: dedupeContacts(
      [...userPhoneRecipients, ...legacyWhatsappRecipients],
      normalizeMobileNumber
    )
  };
};

export default {
  getOrganizationLowStockNotificationRecipients
};
