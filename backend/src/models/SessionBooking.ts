import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISessionBooking extends Document {
  smartQuadSlotId: Types.ObjectId;
  studentEnrollmentId: Types.ObjectId;
  sessionDate: Date; // Specific date for the session (e.g., Monday, Dec 4, 2024)
  status: 'booked' | 'completed' | 'cancelled' | 'no-show';
  meetingLink?: string;
  bookedAt: Date;
  bookingType: 'single' | 'weekly'; // Single session or weekly recurring
  weeklyBookingEndDate?: Date; // If weekly, when to stop creating sessions
  attendanceMarked: boolean;
  notes?: string;
  cancelledBy?: Types.ObjectId;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionBookingSchema = new Schema<ISessionBooking>({
  smartQuadSlotId: {
    type: Schema.Types.ObjectId,
    ref: 'SmartQuadSlot',
    required: true,
  },
  studentEnrollmentId: {
    type: Schema.Types.ObjectId,
    ref: 'StudentEnrollment',
    required: true,
  },
  sessionDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['booked', 'completed', 'cancelled', 'no-show'],
    default: 'booked',
  },
  meetingLink: {
    type: String,
  },
  bookedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  bookingType: {
    type: String,
    enum: ['single', 'weekly'],
    required: true,
    default: 'single',
  },
  weeklyBookingEndDate: {
    type: Date,
  },
  attendanceMarked: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
    maxlength: 200,
  },
  cancelledAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
sessionBookingSchema.index({ smartQuadSlotId: 1, sessionDate: 1 });
sessionBookingSchema.index({ studentEnrollmentId: 1, status: 1 });
sessionBookingSchema.index({ sessionDate: 1, status: 1 });
sessionBookingSchema.index({ smartQuadSlotId: 1, sessionDate: 1, studentEnrollmentId: 1 }, { unique: true });

// Index for booking conflicts prevention
sessionBookingSchema.index({ 
  smartQuadSlotId: 1, 
  sessionDate: 1, 
  status: 1 
});

export const SessionBooking = mongoose.model<ISessionBooking>('SessionBooking', sessionBookingSchema);
