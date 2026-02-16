import mongoose from 'mongoose';

const pickAllocationSchema = new mongoose.Schema(
  {
    bin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseBin',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const pickTicketItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    pickedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    allocations: {
      type: [pickAllocationSchema],
      default: []
    }
  },
  { _id: false }
);

const pickTicketSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['CREATED', 'PICKING', 'PACKED', 'CANCELLED'],
      default: 'CREATED',
      index: true
    },
    items: {
      type: [pickTicketItemSchema],
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    packedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

pickTicketSchema.pre('validate', function setTicketNumber(next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

pickTicketSchema.index({ organization: 1, warehouse: 1, status: 1 });

export default mongoose.model('PickTicket', pickTicketSchema);
