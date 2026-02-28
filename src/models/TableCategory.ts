import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITableCategory extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  capacity: number;
  color: string;
  benefits: string[];
  position3D: {
    x: number;
    y: number;
    z: number;
  };
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TableCategorySchema = new Schema<ITableCategory>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity (people per table) is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [50, 'Capacity cannot exceed 50 people per table'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color (e.g., #FF5733)'],
    },
    benefits: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 20;
        },
        message: 'Cannot have more than 20 benefits',
      },
    },
    position3D: {
      type: {
        x: { type: Number, required: true, default: 0 },
        y: { type: Number, required: true, default: 0 },
        z: { type: Number, required: true, default: 0 },
      },
      default: { x: 0, y: 0, z: 0 },
    },
    icon: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique category name per event
TableCategorySchema.index({ eventId: 1, name: 1 }, { unique: true });
TableCategorySchema.index({ eventId: 1, price: 1 });

const TableCategory: Model<ITableCategory> =
  mongoose.models.TableCategory ||
  mongoose.model<ITableCategory>('TableCategory', TableCategorySchema);

export default TableCategory;
