import mongoose from 'mongoose';

const orderProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    unitSalePrice: {
      type: Number,
      default: null,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    lineRevenue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['purchase', 'sale'],
      required: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true
    },
    products: {
      type: [orderProductSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending'
    },
    subtotalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalTax: {
      type: Number,
      default: 0,
      min: 0
    },
    netRevenue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

orderSchema.pre('validate', function normalizeOrder(next) {
  if (!Array.isArray(this.products) || this.products.length === 0) {
    return next();
  }

  let subtotalRevenue = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const line of this.products) {
    if (this.type === 'sale') {
      if (!line.warehouse && this.warehouse) {
        line.warehouse = this.warehouse;
      }

      if (!line.warehouse) {
        return next(
          new Error('warehouse is required for each sale line item')
        );
      }

      if (!Number.isFinite(Number(line.unitSalePrice))) {
        return next(
          new Error('unitSalePrice is required for each sale line item')
        );
      }

      const quantity = Number(line.quantity || 0);
      const unitSalePrice = Number(line.unitSalePrice || 0);
      const discountAmount = Number(line.discountAmount || 0);
      const taxAmount = Number(line.taxAmount || 0);

      line.lineRevenue = Math.round(
        (quantity * unitSalePrice - discountAmount + taxAmount + Number.EPSILON) * 100
      ) / 100;

      subtotalRevenue += quantity * unitSalePrice;
      totalDiscount += discountAmount;
      totalTax += taxAmount;
    }
  }

  this.subtotalRevenue = Math.round((subtotalRevenue + Number.EPSILON) * 100) / 100;
  this.totalDiscount = Math.round((totalDiscount + Number.EPSILON) * 100) / 100;
  this.totalTax = Math.round((totalTax + Number.EPSILON) * 100) / 100;
  this.netRevenue = Math.round(
    (subtotalRevenue - totalDiscount + totalTax + Number.EPSILON) * 100
  ) / 100;

  return next();
});

orderSchema.index({ organization: 1, createdAt: -1 });
orderSchema.index({ organization: 1, status: 1, type: 1 });

export default mongoose.model('Order', orderSchema);
