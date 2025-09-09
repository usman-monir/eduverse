import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStudentEnrollment extends Document {
  smartQuadBatchId: Types.ObjectId;
  studentId: Types.ObjectId;
  studentName: string;
  studentEmail: string;
  enrollmentDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  totalSessionsAllowed?: number; // Optional: limit total sessions
  sessionsUsed: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentEnrollmentSchema = new Schema<IStudentEnrollment>({
  smartQuadBatchId: {
    type: Schema.Types.ObjectId,
    ref: 'SmartQuadBatch',
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  studentEmail: {
    type: String,
    required: true,
  },
  enrollmentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active',
  },
  totalSessionsAllowed: {
    type: Number,
    min: 0,
  },
  sessionsUsed: {
    type: Number,
    default: 0,
    min: 0,
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
studentEnrollmentSchema.index({ smartQuadBatchId: 1, status: 1 });
studentEnrollmentSchema.index({ studentId: 1, status: 1 });
studentEnrollmentSchema.index({ expiryDate: 1, status: 1 });
studentEnrollmentSchema.index({ smartQuadBatchId: 1, studentId: 1 }, { unique: true });

// Auto-update status based on expiry date
studentEnrollmentSchema.pre('save', function() {
  if (this.expiryDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
});

export const StudentEnrollment = mongoose.model<IStudentEnrollment>('StudentEnrollment', studentEnrollmentSchema);
