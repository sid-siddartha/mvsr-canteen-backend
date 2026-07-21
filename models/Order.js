const mongoose = require('mongoose');
const qr = require('qrcode');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    customerName: {
      type: String,
      required: [true, 'Please provide the customer name'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Online'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Cancelled'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Delivered'],
      default: 'Pending',
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    transactionTime: {
      type: Date,
    },
    qrCodeData: {
      type: String,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    scannedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to generate unique orderId prefix
async function generateUniqueOrderId() {
  const digits = Math.floor(1000 + Math.random() * 9000); // 4-digit code
  const code = `CE-${digits}`;
  
  // Check if it already exists
  const existingOrder = await mongoose.models.Order.findOne({ orderId: code });
  if (existingOrder) {
    return generateUniqueOrderId(); // Recurse
  }
  return code;
}

// Pre-save hook to generate orderId and qrCodeData
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    this.orderId = await generateUniqueOrderId();
  }
  
  // Generate QR Code if not present
  if (!this.qrCodeData) {
    try {
      // The QR code contains the orderId which the staff dashboard scans
      const dataUrl = await qr.toDataURL(this.orderId);
      this.qrCodeData = dataUrl;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
