import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  reservationId: mongoose.Types.ObjectId;
  provider: 'mercadopago' | 'cash';
  externalId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  amount: number;
  currency: string;
  metadata: Record<string, any>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation ID is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: {
        values: ['mercadopago', 'cash'],
        message: '{VALUE} is not a valid payment provider',
      },
      required: [true, 'Payment provider is required'],
    },
    externalId: {
      type: String,
      trim: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'ARS',
      trim: true,
      uppercase: true,
      maxlength: [3, 'Currency code cannot exceed 3 characters'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PaymentSchema.index({ reservationId: 1 });
PaymentSchema.index({ externalId: 1 }, { sparse: true });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ provider: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
