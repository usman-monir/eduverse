import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISmartQuadBatch extends Document {
  name: string;
  description?: string;
  courseType: 'smart-quad' | 'one-on-one';
  preferredLanguage: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore: number;
  status: 'active' | 'inactive' | 'archived';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const smartQuadBatchSchema = new Schema<ISmartQuadBatch>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  courseType: {
    type: String,
    enum: ['smart-quad', 'one-on-one'],
    required: true,
    default: 'smart-quad',
  },
  preferredLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Punjabi', 'Nepali'],
    required: true,
  },
  desiredScore: {
    type: Number,
    required: true,
    min: 0,
    max: 90,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
smartQuadBatchSchema.index({ status: 1 });
smartQuadBatchSchema.index({ preferredLanguage: 1, status: 1 });
smartQuadBatchSchema.index({ createdBy: 1 });
smartQuadBatchSchema.index({ name: 1 });

export const SmartQuadBatch = mongoose.model<ISmartQuadBatch>('SmartQuadBatch', smartQuadBatchSchema);
