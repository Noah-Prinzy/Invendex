import { buildSupplierNotificationEmailHtml } from '../services/notifications/notificationService.js';

describe('notificationService email html builders', () => {
  it('builds branded supplier notification html', () => {
    const html = buildSupplierNotificationEmailHtml({
      supplierName: 'Acme Supply Co',
      subject: 'Purchase order ready for dispatch',
      message: 'Please confirm shipment timing for PO-2001.',
      metadata: {
        organizationName: 'Dope Clothes',
        reference: 'PO-2001'
      }
    });

    expect(html).toContain('Invendex supplier');
    expect(html).toContain('Purchase order ready for dispatch');
    expect(html).toContain('Acme Supply Co');
    expect(html).toContain('Dope Clothes');
    expect(html).toContain('PO-2001');
  });
});
