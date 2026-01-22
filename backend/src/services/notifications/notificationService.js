/**
 * 📤 Notification Service
 * Email / SMS / Webhook ready
 */

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
