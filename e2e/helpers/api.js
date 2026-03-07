const { expect, request } = require('@playwright/test');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:4100';

const extractEntityId = (payload) =>
  String(
    payload?._id ||
      payload?.id ||
      payload?.product?._id ||
      payload?.product?.id ||
      payload?.warehouse?._id ||
      payload?.warehouse?.id ||
      payload?.user?._id ||
      payload?.user?.id ||
      ''
  ).trim();

const apiJson = async (api, method, path, { token = null, data } = {}) => {
  const response = await api.fetch(path, {
    method,
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined,
    data
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok()) {
    throw new Error(
      `${method} ${path} failed with ${response.status()} -> ${JSON.stringify(body)}`
    );
  }

  return body;
};

const waitForApiReady = async (api) => {
  await expect
    .poll(async () => {
      const response = await api.get('/api/health');
      return response.status();
    }, {
      timeout: 90 * 1000,
      intervals: [500, 1000, 2000]
    })
    .toBe(200);
};

const createApiContext = async () => {
  const api = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  });
  await waitForApiReady(api);
  return api;
};

const registerAdminWorkspace = async (api, suffix) => {
  const adminEmail = `e2e.admin.${suffix}@example.com`;
  const adminUsername = `e2eadmin${suffix}`;
  const adminPassword = 'QaAdmin123!';
  const companyName = `Inventra E2E ${suffix}`;

  const registerBody = await apiJson(api, 'POST', '/auth/register', {
    data: {
      email: adminEmail,
      password: adminPassword,
      confirmPassword: adminPassword,
      organizationName: companyName,
      username: adminUsername,
      mobileNumber: '+256700111111'
    }
  });

  const adminToken = registerBody?.data?.accessToken;
  if (!adminToken) {
    throw new Error('admin token missing from register response');
  }

  return {
    companyName,
    admin: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword
    },
    adminToken
  };
};

const createWarehouseSet = async (api, adminToken, suffix) => {
  const kampalaBody = await apiJson(api, 'POST', '/api/warehouses', {
    token: adminToken,
    data: {
      name: 'Kampala Central',
      code: `KLA${suffix}`.slice(0, 24)
    }
  });

  const entebbeBody = await apiJson(api, 'POST', '/api/warehouses', {
    token: adminToken,
    data: {
      name: 'Entebbe Annex',
      code: `EBB${suffix}`.slice(0, 24)
    }
  });

  return {
    kampala: {
      id: extractEntityId(kampalaBody?.data),
      name: 'Kampala Central'
    },
    entebbe: {
      id: extractEntityId(entebbeBody?.data),
      name: 'Entebbe Annex'
    }
  };
};

const createProductCatalog = async (api, adminToken, suffix) => {
  const retroName = `Retro Jacket ${suffix}`;
  const sneakerName = `Canvas Sneaker ${suffix}`;

  const retroBody = await apiJson(api, 'POST', '/api/products', {
    token: adminToken,
    data: {
      name: retroName,
      price: 120000,
      category: 'Apparel',
      lowStockThreshold: 5,
      skuPrefix: `RET${suffix}`.slice(0, 24)
    }
  });

  const sneakerBody = await apiJson(api, 'POST', '/api/products', {
    token: adminToken,
    data: {
      name: sneakerName,
      price: 80000,
      category: 'Footwear',
      lowStockThreshold: 4,
      skuPrefix: `SNK${suffix}`.slice(0, 24)
    }
  });

  return {
    retro: {
      id: extractEntityId(retroBody?.data),
      name: retroName,
      sku: String(retroBody?.data?.sku || '').trim()
    },
    sneaker: {
      id: extractEntityId(sneakerBody?.data),
      name: sneakerName,
      sku: String(sneakerBody?.data?.sku || '').trim()
    }
  };
};

const seedInventoryForWarehouseScope = async (
  api,
  adminToken,
  products,
  warehouses,
  includeLowStockNotifications = false
) => {
  await apiJson(api, 'PATCH', `/api/products/${products.retro.id}/stock`, {
    token: adminToken,
    data: {
      amount: 3,
      reason: 'restock',
      warehouseId: warehouses.kampala.id
    }
  });
  await apiJson(api, 'PATCH', `/api/products/${products.retro.id}/stock`, {
    token: adminToken,
    data: {
      amount: 20,
      reason: 'restock',
      warehouseId: warehouses.entebbe.id
    }
  });
  await apiJson(api, 'PATCH', `/api/products/${products.sneaker.id}/stock`, {
    token: adminToken,
    data: {
      amount: 6,
      reason: 'restock',
      warehouseId: warehouses.kampala.id
    }
  });
  await apiJson(api, 'PATCH', `/api/products/${products.sneaker.id}/stock`, {
    token: adminToken,
    data: {
      amount: 1,
      reason: 'restock',
      warehouseId: warehouses.entebbe.id
    }
  });

  if (includeLowStockNotifications) {
    await apiJson(api, 'POST', '/api/inventory/alerts/reorder/run', {
      token: adminToken
    });
  }
};

const createEmployeeSignupRequest = async ({
  api,
  companyName,
  suffix,
  username,
  email,
  password = 'QaStaff123!',
  mobileNumber = '+256700222222'
}) => {
  const resolvedUsername = username || `e2estaff${suffix}`;
  const resolvedEmail = email || `e2e.staff.${suffix}@example.com`;
  const resolvedPassword = password;

  const signupBody = await apiJson(api, 'POST', '/auth/employee/signup', {
    data: {
      companyName,
      email: resolvedEmail,
      password: resolvedPassword,
      confirmPassword: resolvedPassword,
      username: resolvedUsername,
      mobileNumber
    }
  });

  const requestId = String(signupBody?.data?.requestId || '').trim();
  if (!requestId) {
    throw new Error('employee signup requestId missing');
  }

  return {
    requestId,
    email: resolvedEmail,
    username: resolvedUsername,
    password: resolvedPassword,
    mobileNumber
  };
};

const approveEmployeeSignupRequest = async ({
  api,
  adminToken,
  requestId
}) => {
  await apiJson(
    api,
    'POST',
    `/auth/employee/signup-requests/${requestId}/approve`,
    {
      token: adminToken,
      data: {}
    }
  );
};

const createSupplier = async ({ api, adminToken, suffix }) => {
  const supplierBody = await apiJson(api, 'POST', '/api/suppliers', {
    token: adminToken,
    data: {
      name: `E2E Supplier ${suffix}`,
      email: `supplier.${suffix}@example.com`,
      phone: '+256701111111'
    }
  });

  return {
    id: extractEntityId(supplierBody?.data),
    name: String(supplierBody?.data?.name || `E2E Supplier ${suffix}`)
  };
};

const createPurchaseOrder = async ({
  api,
  adminToken,
  supplierId,
  warehouseId,
  product,
  quantity = 4,
  unitCost = 45000
}) => {
  const purchaseOrderBody = await apiJson(api, 'POST', '/api/purchase-orders', {
    token: adminToken,
    data: {
      supplier: supplierId,
      warehouse: warehouseId,
      expectedDeliveryDate: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
      notes: 'Playwright smoke order',
      items: [
        {
          product: product.id,
          sku: String(product.sku || '').trim() || undefined,
          quantity,
          unitCost
        }
      ]
    }
  });

  return {
    id: extractEntityId(purchaseOrderBody?.data),
    poNumber: String(purchaseOrderBody?.data?.poNumber || '').trim(),
    status: String(purchaseOrderBody?.data?.status || '').trim()
  };
};

const seedWorkspaceScenario = async ({
  suffix,
  includeEmployee = false,
  includeReportsData = false,
  includeLowStockNotifications = false
}) => {
  const api = await createApiContext();

  const { companyName, admin, adminToken } = await registerAdminWorkspace(
    api,
    suffix
  );

  const warehouses = await createWarehouseSet(api, adminToken, suffix);
  const products = await createProductCatalog(api, adminToken, suffix);
  await seedInventoryForWarehouseScope(
    api,
    adminToken,
    products,
    warehouses,
    includeLowStockNotifications
  );

  const scenario = {
    companyName,
    admin,
    adminToken,
    warehouses,
    products
  };

  if (includeEmployee) {
    const employee = await createEmployeeSignupRequest({
      api,
      companyName,
      suffix
    });
    await approveEmployeeSignupRequest({
      api,
      adminToken,
      requestId: employee.requestId
    });

    scenario.employee = {
      email: employee.email,
      username: employee.username,
      password: employee.password,
      mobileNumber: employee.mobileNumber
    };
  }

  if (includeReportsData) {
    const supplier = await createSupplier({ api, adminToken, suffix });
    const purchaseOrder = await createPurchaseOrder({
      api,
      adminToken,
      supplierId: supplier.id,
      warehouseId: warehouses.kampala.id,
      product: products.retro
    });

    scenario.supplier = supplier;
    scenario.purchaseOrder = purchaseOrder;
  }

  await api.dispose();
  return scenario;
};

module.exports = {
  API_BASE_URL,
  createApiContext,
  seedWorkspaceScenario,
  registerAdminWorkspace,
  createWarehouseSet,
  createProductCatalog,
  seedInventoryForWarehouseScope,
  createEmployeeSignupRequest,
  approveEmployeeSignupRequest,
  createSupplier,
  createPurchaseOrder
};
