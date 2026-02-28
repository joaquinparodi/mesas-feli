import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  number: number;
  label: string;
  status: 'available' | 'reserved' | 'sold' | 'blocked';
  position3D: {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  sectorLabel: string;
  reservedUntil?: Date;
  reservedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'TableCategory',
      required: [true, 'Category ID is required'],
      index: true,
    },
    number: {
      type: Number,
      required: [true, 'Table number is required'],
      min: [1, 'Table number must be at least 1'],
    },
    label: {
      type: String,
      required: [true, 'Table label is required'],
      trim: true,
      maxlength: [50, 'Label cannot exceed 50 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'reserved', 'sold', 'blocked'],
        message: '{VALUE} is not a valid table status',
      },
      default: 'available',
    },
    position3D: {
      type: {
        x: { type: Number, required: true, default: 0 },
        y: { type: Number, required: true, default: 0 },
        z: { type: Number, required: true, default: 0 },
        rotation: { type: Number, default: 0 },
      },
      default: { x: 0, y: 0, z: 0, rotation: 0 },
    },
    sectorLabel: {
      type: String,
      required: [true, 'Sector label is required'],
      trim: true,
      maxlength: [100, 'Sector label cannot exceed 100 characters'],
    },
    reservedUntil: {
      type: Date,
      default: null,
    },
    reservedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique table number per event
TableSchema.index({ eventId: 1, number: 1 }, { unique: true });
TableSchema.index({ eventId: 1, status: 1 });
TableSchema.index({ eventId: 1, categoryId: 1, status: 1 });
TableSchema.index({ reservedUntil: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'reserved' } });
TableSchema.index({ reservedBy: 1 });

const Table: Model<ITable> =
  mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);

export default Table;
