/**
 * 📤 Notification Service
 * Email / SMS / Webhook ready
 */
import { getDefaultLowStockRecipients, sendBulkSms } from './smsService.js';

export const sendSupplierNotification = async ({
  supplier,
  subject,
  message,
  metadata = {}
}) => {
  if (!supplier?.email) {
    throw new Error('Supplier email not available');
  }

  // 🚧 Email integration placeholder
  // (SendGrid / Nodemailer / SES later)
  console.log('📧 SUPPLIER EMAIL SENT');
  console.log('To:', supplier.email);
  console.log('Subject:', subject);
  console.log('Message:', message);
  console.log('Metadata:', metadata);

  return {
    success: true,
    channel: 'email',
    recipient: supplier.email
  };
};

export const sendLowStockSmsNotification = async ({
  organizationName = 'Organization',
  sku,
  productName,
  currentStock,
  reorderLevel,
  recipients = []
}) => {
  const targetRecipients = Array.from(
    new Set([
      ...getDefaultLowStockRecipients(),
      ...(Array.isArray(recipients) ? recipients : [])
    ])
  );

  if (!targetRecipients.length) {
    return {
      success: false,
      channel: 'sms',
      skipped: true,
      reason: 'No low-stock recipients configured'
    };
  }

  const message = [
    `Ledgerly low-stock alert (${organizationName})`,
    `${productName || 'Product'} [${sku || 'N/A'}]`,
    `Stock: ${Number(currentStock || 0)} | Reorder: ${Number(reorderLevel || 0)}`
  ].join(' | ');

  const smsResult = await sendBulkSms({
    recipients: targetRecipients,
    message
  });

  return {
    success: smsResult.deliveredCount > 0,
    channel: 'sms',
    recipients: targetRecipients,
    ...smsResult
  };
};

export default {
  sendSupplierNotification,
  sendLowStockSmsNotification
};
