import { jest } from '@jest/globals';

const mockFind = jest.fn();
const mockQueueEmailNotification = jest.fn();
const mockSendBulkSms = jest.fn();
const mockSendBulkWhatsApp = jest.fn();
const originalJwtAccessSecret = process.env.JWT_ACCESS_SECRET;

await jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    find: mockFind
  }
}));

await jest.unstable_mockModule(
  '../services/notifications/emailJobService.js',
  () => ({
    queueEmailNotification: mockQueueEmailNotification
  })
);

await jest.unstable_mockModule(
  '../services/notifications/smsService.js',
  () => ({
    sendBulkSms: mockSendBulkSms,
    sendBulkWhatsApp: mockSendBulkWhatsApp
  })
);

const { notifyAdminsOfEmployeeAuthEvent } =
  await import('../services/notifications/adminAuthAlertService.js');

const mockAdminLookup = (users) => {
  const lean = jest.fn().mockResolvedValue(users);
  const select = jest.fn().mockReturnValue({ lean });
  mockFind.mockReturnValue({ select });
  return { select, lean };
};

describe('adminAuthAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      originalJwtAccessSecret || 'test_access_secret';
    mockQueueEmailNotification.mockResolvedValue({ queued: true });
    mockSendBulkSms.mockResolvedValue({
      count: 0,
      deliveredCount: 0,
      results: []
    });
    mockSendBulkWhatsApp.mockResolvedValue({
      count: 0,
      deliveredCount: 0,
      results: []
    });
  });

  afterAll(() => {
    process.env.JWT_ACCESS_SECRET = originalJwtAccessSecret;
  });

  it('sends deduped email and WhatsApp alerts for employee signup requests', async () => {
    mockAdminLookup([
      {
        _id: '65f000000000000000000001',
        email: 'Admin.One@example.com',
        mobileNumber: '+256700001111'
      },
      {
        _id: '65f000000000000000000002',
        email: 'admin.one@example.com',
        mobileNumber: '+256700001111'
      },
      {
        _id: '65f000000000000000000003',
        email: 'owner@example.com',
        mobileNumber: '+256700002222'
      }
    ]);

    const result = await notifyAdminsOfEmployeeAuthEvent({
      organizationId: 'org_123',
      actorUserId: 'user_123',
      eventType: 'employee_signup_request',
      signupRequestId: '65f100000000000000000010',
      publicApiBaseUrl: 'http://localhost:4000',
      organizationName: 'Dope Clothes',
      employeeEmail: 'staff@example.com',
      employeeUsername: 'staff.user',
      employeeRole: 'staff',
      employeeMobileNumber: '+256700009999'
    });

    expect(mockFind).toHaveBeenCalledWith({
      organization: 'org_123',
      role: {
        $in: ['owner', 'admin']
      },
      isActive: true
    });
    expect(mockQueueEmailNotification).toHaveBeenCalledTimes(2);
    expect(mockQueueEmailNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        organizationId: 'org_123',
        createdBy: 'user_123',
        to: 'admin.one@example.com',
        subject: 'Invendex employee signup request (Dope Clothes)',
        notificationType: 'EMPLOYEE_SIGNUP_REQUEST',
        html: expect.stringContaining('Approve request'),
        text: expect.stringContaining(
          '/auth/employee/signup-requests/review-email?token='
        )
      })
    );
    expect(mockQueueEmailNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'owner@example.com'
      })
    );
    expect(mockSendBulkSms).not.toHaveBeenCalled();
    expect(mockSendBulkWhatsApp).toHaveBeenCalledWith({
      recipients: ['+256700001111', '+256700002222'],
      message: expect.stringContaining('Employee signup request')
    });
    expect(result.queued).toBe(true);
    expect(result.emailRecipients).toEqual([
      'admin.one@example.com',
      'owner@example.com'
    ]);
    expect(result.mobileRecipients).toEqual(['+256700001111', '+256700002222']);
  });

  it('skips external delivery for employee sign-in events', async () => {
    const result = await notifyAdminsOfEmployeeAuthEvent({
      organizationId: 'org_123',
      actorUserId: 'user_123',
      eventType: 'employee_signin',
      organizationName: 'Dope Clothes',
      employeeEmail: 'staff@example.com',
      employeeUsername: 'staff.user',
      employeeRole: 'staff'
    });

    expect(mockFind).not.toHaveBeenCalled();
    expect(mockQueueEmailNotification).not.toHaveBeenCalled();
    expect(mockSendBulkSms).not.toHaveBeenCalled();
    expect(mockSendBulkWhatsApp).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        queued: false,
        skipped: true,
        reason: 'event_policy_in_app_only'
      })
    );
  });

  it('fails closed and returns a safe result when admin lookup errors', async () => {
    const lean = jest.fn().mockRejectedValue(new Error('lookup_failed'));
    const select = jest.fn().mockReturnValue({ lean });
    mockFind.mockReturnValue({ select });

    await expect(
      notifyAdminsOfEmployeeAuthEvent({
        organizationId: 'org_123',
        eventType: 'employee_signup_request',
        organizationName: 'Dope Clothes',
        employeeEmail: 'staff@example.com'
      })
    ).resolves.toEqual(
      expect.objectContaining({
        queued: false,
        skipped: false,
        reason: 'lookup_failed'
      })
    );

    expect(mockQueueEmailNotification).not.toHaveBeenCalled();
    expect(mockSendBulkSms).not.toHaveBeenCalled();
    expect(mockSendBulkWhatsApp).not.toHaveBeenCalled();
  });
});
