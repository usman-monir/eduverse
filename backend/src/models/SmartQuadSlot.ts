import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISmartQuadSlot extends Document {
  smartQuadBatchId: Types.ObjectId;
  tutorId: Types.ObjectId;
  tutorName: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeSlot: string; // e.g., "09:00"
  duration: number; // in minutes
  maxStudents: number;
  timezone: string; // e.g., "Asia/Kolkata", "UTC", "America/New_York"
  effectiveStartDate: Date; // When this slot pattern starts being valid
  effectiveEndDate?: Date; // Optional: When this slot pattern ends
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const smartQuadSlotSchema = new Schema<ISmartQuadSlot>({
  smartQuadBatchId: {
    type: Schema.Types.ObjectId,
    ref: 'SmartQuadBatch',
    required: true,
  },
  tutorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tutorName: {
    type: String,
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'],
    required: true,
  },
  timeSlot: {
    type: String,
    required: true, // Format: "HH:MM" (24-hour)
    validate: {
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time slot must be in HH:MM format'
    }
  },
  duration: {
    type: Number,
    required: true,
    default: 60, // 60 minutes
    min: 15,
    max: 180,
  },
  maxStudents: {
    type: Number,
    required: true,
    default: 4,
    min: 1,
    max: 10,
  },
  timezone: {
    type: String,
    required: true,
    default: 'Australia/Sydney',
    validate: {
      validator: function(v: string) {
        // Basic timezone validation
        return /^[A-Z][a-z]+\/[A-Z][a-z]+(_[A-Z][a-z]+)*$|^UTC$/.test(v);
      },
      message: 'Invalid timezone format. Use format like "Australia/Sydney" or "UTC"'
    }
  },
  effectiveStartDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  effectiveEndDate: {
    type: Date,
    validate: {
      validator: function(this: ISmartQuadSlot, v: Date) {
        return !v || v > this.effectiveStartDate;
      },
      message: 'Effective end date must be after start date'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
smartQuadSlotSchema.index({ smartQuadBatchId: 1, isActive: 1 });
smartQuadSlotSchema.index({ tutorId: 1, dayOfWeek: 1, timeSlot: 1 });
smartQuadSlotSchema.index({ dayOfWeek: 1, timeSlot: 1 });
smartQuadSlotSchema.index({ smartQuadBatchId: 1, dayOfWeek: 1 });

// Ensure unique slot per tutor per time
smartQuadSlotSchema.index(
  { tutorId: 1, dayOfWeek: 1, timeSlot: 1 }, 
  { unique: true }
);

export const SmartQuadSlot = mongoose.model<ISmartQuadSlot>('SmartQuadSlot', smartQuadSlotSchema);
