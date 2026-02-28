import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReservation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  promoterId?: mongoose.Types.ObjectId;
  status: 'pending' | 'confirmed' | 'cancelled' | 'used';
  paymentId?: mongoose.Types.ObjectId;
  paymentMethod?: string;
  amount: number;
  qrCode: string;
  qrUsed: boolean;
  benefits: string[];
  guestCount: number;
  guestNames: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
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
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table ID is required'],
      index: true,
    },
    promoterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'used'],
        message: '{VALUE} is not a valid reservation status',
      },
      default: 'pending',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    qrCode: {
      type: String,
      required: [true, 'QR code is required'],
      unique: true,
    },
    qrUsed: {
      type: Boolean,
      default: false,
    },
    benefits: {
      type: [String],
      default: [],
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1'],
      max: [50, 'Guest count cannot exceed 50'],
    },
    guestNames: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 50;
        },
        message: 'Cannot have more than 50 guest names',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
ReservationSchema.index({ userId: 1, status: 1 });
ReservationSchema.index({ eventId: 1, status: 1 });
ReservationSchema.index({ tableId: 1, eventId: 1 });
ReservationSchema.index({ promoterId: 1, status: 1 });
ReservationSchema.index({ qrCode: 1 }, { unique: true });
ReservationSchema.index({ createdAt: -1 });

const Reservation: Model<IReservation> =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>('Reservation', ReservationSchema);

export default Reservation;
