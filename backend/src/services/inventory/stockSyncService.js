import mongoose from 'mongoose';
import Inventory from '../../models/Inventory.js';
import Product from '../../models/Product.js';
import { AppError } from '../../errors/AppError.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const buildInventoryAggregate = ({ organizationId, productId }) => {
  const match = {
    organization: toObjectId(organizationId)
  };
  if (productId) {
    match.product = toObjectId(productId);
  }

  return [
    { $match: match },
    {
      $group: {
        _id: '$product',
        stock: { $sum: '$quantityOnHand' }
      }
    }
  ];
};

export const syncProductStockFromInventory = async ({
  organizationId,
  productId,
  session = null,
  throwIfMissingProduct = true
}) => {
  const aggregate = Inventory.aggregate(
    buildInventoryAggregate({ organizationId, productId })
  );
  if (session) {
    aggregate.session(session);
  }
  const rows = await aggregate;
  const derivedStock = Math.max(Number(rows[0]?.stock || 0), 0);

  const updateOptions = {
    new: true,
    runValidators: true
  };
  if (session) {
    updateOptions.session = session;
  }

  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      organization: organizationId
    },
    {
      $set: {
        stock: derivedStock
      }
    },
    updateOptions
  );

  if (!updatedProduct && throwIfMissingProduct) {
    throw new AppError('Product not found for stock sync', 404);
  }

  return {
    product: updatedProduct || null,
    stock: derivedStock
  };
};

export const syncOrganizationProductStockFromInventory = async ({
  organizationId,
  dryRun = true,
  session = null
}) => {
  const aggregate = Inventory.aggregate(
    buildInventoryAggregate({ organizationId, productId: null })
  );
  if (session) {
    aggregate.session(session);
  }
  const inventoryRows = await aggregate;

  const productQuery = Product.find({
    organization: organizationId
  }).select('_id stock');
  if (session) {
    productQuery.session(session);
  }
  const products = await productQuery;

  const derivedByProduct = new Map(
    inventoryRows.map((row) => [
      String(row._id),
      Math.max(Number(row.stock || 0), 0)
    ])
  );

  const updates = [];
  for (const product of products) {
    const productId = String(product._id);
    const currentStock = Number(product.stock || 0);
    const derivedStock = Number(derivedByProduct.get(productId) || 0);
    if (currentStock !== derivedStock) {
      updates.push({
        productId,
        previousStock: currentStock,
        derivedStock
      });
    }
  }

  if (!dryRun && updates.length) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: {
          _id: toObjectId(update.productId),
          organization: toObjectId(organizationId)
        },
        update: {
          $set: {
            stock: update.derivedStock
          }
        }
      }
    }));

    const options = session ? { session } : undefined;
    await Product.bulkWrite(bulkOps, options);
  }

  return {
    organizationId: String(organizationId),
    checkedProducts: products.length,
    updatesNeeded: updates.length,
    updatesApplied: dryRun ? 0 : updates.length,
    updates,
    dryRun
  };
};

export default {
  syncProductStockFromInventory,
  syncOrganizationProductStockFromInventory
};
