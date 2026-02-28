import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVenue extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  capacity: number;
  layout3DModel: Record<string, any>;
  images: string[];
  organizerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      minlength: [2, 'Venue name must be at least 2 characters'],
      maxlength: [200, 'Venue name cannot exceed 200 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100000, 'Capacity cannot exceed 100,000'],
    },
    layout3DModel: {
      type: Schema.Types.Mixed,
      default: {},
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 20;
        },
        message: 'Cannot have more than 20 images',
      },
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VenueSchema.index({ name: 'text', address: 'text' });
VenueSchema.index({ organizerId: 1 });
VenueSchema.index({ createdAt: -1 });

const Venue: Model<IVenue> =
  mongoose.models.Venue || mongoose.model<IVenue>('Venue', VenueSchema);

export default Venue;
