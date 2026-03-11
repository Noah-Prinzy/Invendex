import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import {
  dedupeContacts,
  isValidMobileNumber,
  normalizeMobileNumber
} from '../../utils/contactInfo.js';

export const getOrganizationLowStockNotificationRecipients = async ({
  organizationId
}) => {
  const [organization, users] = await Promise.all([
    Organization.findById(organizationId)
      .select(
        'name smsLowStockEnabled smsLowStockRecipients whatsappLowStockEnabled whatsappLowStockRecipients'
      )
      .lean(),
    User.find({
      organization: organizationId,
      isActive: true
    })
      .select('mobileNumber')
      .lean()
  ]);

  const userPhoneRecipients = dedupeContacts(
    (users || [])
      .map((user) => user?.mobileNumber)
      .filter((mobileNumber) => isValidMobileNumber(mobileNumber)),
    normalizeMobileNumber
  );

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
    smsEnabled: Boolean(organization?.smsLowStockEnabled),
    whatsappEnabled: Boolean(organization?.whatsappLowStockEnabled),
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
