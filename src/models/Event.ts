import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  venue: mongoose.Types.ObjectId;
  date: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'sold_out' | 'finished';
  organizerId: mongoose.Types.ObjectId;
  layout3DConfig: Record<string, any>;
  coverImage?: string;
  tags: string[];
  ticketPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      validate: {
        validator: function (this: any, v: Date) {
          // Only validate on new documents, not updates
          if (this.isNew) {
            return v > new Date();
          }
          return true;
        },
        message: 'Event date must be in the future',
      },
    },
    endDate: {
      type: Date,
      required: [true, 'Event end date is required'],
      validate: {
        validator: function (this: any, v: Date) {
          return v > this.date;
        },
        message: 'End date must be after start date',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'sold_out', 'finished'],
        message: '{VALUE} is not a valid event status',
      },
      default: 'draft',
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID is required'],
      index: true,
    },
    layout3DConfig: {
      type: Schema.Types.Mixed,
      default: {},
    },
    coverImage: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    ticketPrice: {
      type: Number,
      min: [0, 'Ticket price cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
EventSchema.index({ date: 1, status: 1 });
EventSchema.index({ organizerId: 1, status: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ title: 'text', description: 'text' });
EventSchema.index({ createdAt: -1 });

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
