import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPromoter extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  commissionRate: number;
  totalSales: number;
  totalEarnings: number;
  assignedTables: mongoose.Types.ObjectId[];
  referralToken: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoterSchema = new Schema<IPromoter>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID is required'],
      index: true,
    },
    commissionRate: {
      type: Number,
      required: [true, 'Commission rate is required'],
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100%'],
    },
    totalSales: {
      type: Number,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: [0, 'Total earnings cannot be negative'],
    },
    assignedTables: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Table' }],
      default: [],
    },
    referralToken: {
      type: String,
      required: [true, 'Referral token is required'],
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: a user can only be promoter once per event
PromoterSchema.index({ userId: 1, eventId: 1 }, { unique: true });
PromoterSchema.index({ referralToken: 1 }, { unique: true });
PromoterSchema.index({ organizerId: 1, isActive: 1 });
PromoterSchema.index({ eventId: 1, isActive: 1 });
PromoterSchema.index({ createdAt: -1 });

const Promoter: Model<IPromoter> =
  mongoose.models.Promoter ||
  mongoose.model<IPromoter>('Promoter', PromoterSchema);

export default Promoter;
