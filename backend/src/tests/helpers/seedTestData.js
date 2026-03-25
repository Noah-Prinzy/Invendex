import Organization from '../../models/Organization.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Warehouse from '../../models/Warehouse.js';

const asPositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const makeCode = (prefix, sequence) =>
  `${String(prefix || 'TEST')
    .trim()
    .toUpperCase()}-${String(sequence).padStart(3, '0')}`;

export const createOrganizationSeed = async ({
  name = 'Test Organization',
  code = null,
  sequence = Date.now()
} = {}) => {
  return Organization.create({
    name,
    code: code || makeCode('ORG', sequence)
  });
};

export const createUserSeed = async ({
  organizationId = null,
  email = null,
  username = null,
  password = 'Password123!',
  role = 'admin',
  sequence = Date.now(),
  overrides = {}
} = {}) => {
  const normalizedSequence = asPositiveInteger(sequence, Date.now());

  return User.create({
    email:
      email ||
      `user-${normalizedSequence}-${Math.floor(Math.random() * 1000)}@example.com`,
    username:
      username ||
      `user_${normalizedSequence}_${Math.floor(Math.random() * 1000)}`,
    password,
    role,
    organization: organizationId,
    isVerified: true,
    ...overrides
  });
};

export const createWarehouseSeed = async ({
  organizationId,
  managerId = null,
  name = 'Main Warehouse',
  code = null,
  sequence = Date.now(),
  overrides = {}
} = {}) => {
  return Warehouse.create({
    organization: organizationId,
    manager: managerId,
    name,
    code: code || makeCode('WH', sequence),
    ...overrides
  });
};

export const createProductSeed = async ({
  organizationId,
  name = 'Seed Product',
  sku = null,
  price = 25,
  stock = 10,
  lowStockThreshold = 3,
  sequence = Date.now(),
  overrides = {}
} = {}) => {
  return Product.create({
    organization: organizationId,
    name,
    sku: sku || makeCode('SKU', sequence),
    price,
    stock,
    lowStockThreshold,
    ...overrides
  });
};

export const seedOrganizationWorkspace = async ({
  organization = {},
  adminUser = {},
  warehouse = {},
  products = []
} = {}) => {
  const seedSequence = asPositiveInteger(
    organization.sequence ||
      adminUser.sequence ||
      warehouse.sequence ||
      Date.now(),
    Date.now()
  );

  const createdOrganization = await createOrganizationSeed({
    sequence: seedSequence,
    ...organization
  });

  const createdAdmin = await createUserSeed({
    organizationId: createdOrganization._id,
    role: 'admin',
    sequence: seedSequence,
    ...adminUser
  });

  const createdWarehouse = await createWarehouseSeed({
    organizationId: createdOrganization._id,
    managerId: createdAdmin._id,
    sequence: seedSequence,
    ...warehouse
  });

  const createdProducts = await Promise.all(
    (Array.isArray(products) ? products : []).map((product, index) =>
      createProductSeed({
        organizationId: createdOrganization._id,
        sequence: seedSequence + index + 1,
        ...product
      })
    )
  );

  return {
    organization: createdOrganization,
    adminUser: createdAdmin,
    warehouse: createdWarehouse,
    products: createdProducts
  };
};

export default {
  createOrganizationSeed,
  createUserSeed,
  createWarehouseSeed,
  createProductSeed,
  seedOrganizationWorkspace
};
