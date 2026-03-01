import Organization from '../../models/Organization.js';
import OrganizationSettings from '../../models/OrganizationSettings.js';
import Warehouse from '../../models/Warehouse.js';
import Supplier from '../../models/Supplier.js';
import Product from '../../models/Product.js';
import Inventory from '../../models/Inventory.js';
import SupplierProduct from '../../models/SupplierProduct.js';
import { AppError } from '../../errors/AppError.js';

const SAMPLE_SEED_VERSION = 'v1';

const SAMPLE_SUPPLIERS = [
  {
    name: 'Nile Distributors',
    email: 'procurement@niledistributors.example',
    phone: '+256700100001'
  },
  {
    name: 'Kampala Industrial Supplies',
    email: 'orders@kampala-industrial.example',
    phone: '+256700100002'
  }
];

const SAMPLE_PRODUCTS = [
  {
    name: 'LED Bulb 12W',
    sku: 'LED-BULB-12W-001',
    price: 18000,
    lowStockThreshold: 20,
    category: 'Electrical',
    openingQty: 120,
    unitCost: 12000
  },
  {
    name: 'Office Printer Paper A4',
    sku: 'PAPER-A4-500-001',
    price: 42000,
    lowStockThreshold: 15,
    category: 'Office Supplies',
    openingQty: 85,
    unitCost: 30000
  },
  {
    name: 'Safety Gloves Pair',
    sku: 'GLOVE-SAFE-PAIR-001',
    price: 9000,
    lowStockThreshold: 30,
    category: 'Safety',
    openingQty: 200,
    unitCost: 5500
  }
];

const ensureOrganization = async (organizationId) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError('Organization not found', 404);
  }
  return organization;
};

const resolveOrCreateWarehouse = async ({ organizationId }) => {
  let warehouse = await Warehouse.findOne({
    organization: organizationId,
    code: 'MAIN'
  });

  if (!warehouse) {
    warehouse = await Warehouse.create({
      organization: organizationId,
      name: 'Main Warehouse',
      code: 'MAIN',
      isActive: true
    });
  }

  return warehouse;
};

const resolveOrCreateSuppliers = async ({ organizationId }) => {
  const supplierIds = [];
  let created = 0;

  for (const supplierSeed of SAMPLE_SUPPLIERS) {
    let supplier = await Supplier.findOne({
      organization: organizationId,
      name: supplierSeed.name
    });

    if (!supplier) {
      supplier = await Supplier.create({
        organization: organizationId,
        ...supplierSeed,
        isActive: true
      });
      created += 1;
    }

    supplierIds.push(supplier._id);
  }

  return {
    supplierIds,
    created
  };
};

const resolveOrCreateProducts = async ({
  organizationId,
  warehouseId,
  supplierIds
}) => {
  let createdProducts = 0;
  let createdInventoryRows = 0;
  let createdSupplierLinks = 0;

  for (const [index, productSeed] of SAMPLE_PRODUCTS.entries()) {
    let product = await Product.findOne({
      organization: organizationId,
      sku: productSeed.sku
    });

    if (!product) {
      product = await Product.create({
        organization: organizationId,
        name: productSeed.name,
        sku: productSeed.sku,
        price: productSeed.price,
        category: productSeed.category,
        lowStockThreshold: productSeed.lowStockThreshold,
        description: 'Sample onboarding product',
        stock: productSeed.openingQty,
        isActive: true
      });
      createdProducts += 1;
    }

    const inventory = await Inventory.findOne({
      organization: organizationId,
      product: product._id,
      warehouse: warehouseId
    });

    if (!inventory) {
      await Inventory.create({
        organization: organizationId,
        product: product._id,
        warehouse: warehouseId,
        quantityOnHand: productSeed.openingQty,
        quantityReserved: 0,
        reorderPoint: product.lowStockThreshold || 0,
        reorderQuantity: Math.max(1, Math.ceil(productSeed.openingQty / 2)),
        lastMovementAt: new Date()
      });
      createdInventoryRows += 1;
    }

    const supplierId = supplierIds[index % supplierIds.length];
    const supplierProduct = await SupplierProduct.findOne({
      organization: organizationId,
      supplier: supplierId,
      product: product._id
    });

    if (!supplierProduct) {
      await SupplierProduct.create({
        organization: organizationId,
        supplier: supplierId,
        product: product._id,
        sku: product.sku,
        unitCost: productSeed.unitCost,
        minimumOrderQuantity: 1,
        leadTimeDays: 7,
        isPreferred: index === 0,
        isActive: true
      });
      createdSupplierLinks += 1;
    }
  }

  return {
    createdProducts,
    createdInventoryRows,
    createdSupplierLinks
  };
};

const ensureSettingsDefaultWarehouse = async ({
  organizationId,
  warehouseId
}) => {
  let settings = await OrganizationSettings.findOne({
    organization: organizationId
  });

  if (!settings) {
    settings = await OrganizationSettings.create({
      organization: organizationId
    });
  }

  if (!settings.inventory?.defaultWarehouse) {
    settings.inventory = settings.inventory || {};
    settings.inventory.defaultWarehouse = warehouseId;
    await settings.save();
    return true;
  }

  return false;
};

export const seedOrganizationSampleData = async ({
  organizationId,
  force = false
}) => {
  const organization = await ensureOrganization(organizationId);

  const alreadySeeded = Boolean(organization.onboardingSampleSeededAt);
  if (alreadySeeded && !force) {
    return {
      skipped: true,
      reason: 'Sample data already seeded for this organization',
      seedVersion: organization.onboardingSampleSeedVersion || null,
      seededAt: organization.onboardingSampleSeededAt
    };
  }

  const warehouse = await resolveOrCreateWarehouse({
    organizationId
  });
  const supplierResult = await resolveOrCreateSuppliers({
    organizationId
  });
  const productResult = await resolveOrCreateProducts({
    organizationId,
    warehouseId: warehouse._id,
    supplierIds: supplierResult.supplierIds
  });
  const defaultWarehouseUpdated = await ensureSettingsDefaultWarehouse({
    organizationId,
    warehouseId: warehouse._id
  });

  organization.onboardingSampleSeededAt = new Date();
  organization.onboardingSampleSeedVersion = SAMPLE_SEED_VERSION;
  await organization.save();

  return {
    skipped: false,
    seedVersion: SAMPLE_SEED_VERSION,
    seededAt: organization.onboardingSampleSeededAt,
    warehouse: {
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code
    },
    summary: {
      suppliersCreated: supplierResult.created,
      productsCreated: productResult.createdProducts,
      inventoryRowsCreated: productResult.createdInventoryRows,
      supplierLinksCreated: productResult.createdSupplierLinks,
      defaultWarehouseUpdated
    }
  };
};

export default {
  seedOrganizationSampleData
};
