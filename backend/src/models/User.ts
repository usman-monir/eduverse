import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Days of the week
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// Time range interface
export interface ITimeRange {
  start: string; // e.g., "09:00"
  end: string;   // e.g., "17:00"
}

// Weekly availability object with optional time ranges
export type IWeeklyAvailability = {
  [key in Weekday]?: ITimeRange | null;
};

// User interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'student' | 'tutor' | 'admin';
  avatar?: string;
  enrolledSessions?: number;
  completedSessions?: number;
  joinedDate: Date;
  status: 'pending' | 'active' | 'inactive';
  accessTill: Date | null;
  subjects?: string[];
  experience?: string;
  weeklyAvailability?: IWeeklyAvailability;
  
  // Student-specific fields
  preferredLanguage?: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore?: number;
  examDeadline?: Date;
  courseType?: 'one-on-one' | 'smart-quad';
  courseDuration?: number; // in weeks
  totalSessions?: number;
  courseExpiryDate?: Date;

  // Accessibility and booking permissions
  canBookOneOnOne?: boolean;
  canRequestSlots?: boolean;
  bookingRestrictions?: {
    reason?: string;
    restrictedBy?: string;
    restrictedAt?: Date;
    expiresAt?: Date;
  };

  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define sub-schema for each day's availability
const timeRangeSchema = new Schema<ITimeRange>(
  {
    start: { type: String, required: true }, // "09:00"
    end: { type: String, required: true },   // "17:00"
  },
  { _id: false }
);

// Define schema for weekly availability
const weeklyAvailabilitySchema = new Schema<IWeeklyAvailability>(
  {
    monday: { type: timeRangeSchema, default: null },
    tuesday: { type: timeRangeSchema, default: null },
    wednesday: { type: timeRangeSchema, default: null },
    thursday: { type: timeRangeSchema, default: null },
    friday: { type: timeRangeSchema, default: null },
    saturday: { type: timeRangeSchema, default: null },
    sunday: { type: timeRangeSchema, default: null },
  },
  { _id: false }
);

// Main user schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'tutor', 'admin'],
      default: 'student',
    },
    avatar: {
      type: String,
    },
    enrolledSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    accessTill: {
      type: Date,
      default: null,
    },
    subjects: [{
      type: String,
      trim: true,
    }],
    experience: {
      type: String,
      trim: true,
    },
    weeklyAvailability: {
      type: weeklyAvailabilitySchema,
      default: {},
    },
    preferredLanguage: {
      type: String,
      enum: ['English', 'Hindi', 'Punjabi', 'Nepali'],
    },
    desiredScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    examDeadline: {
      type: Date,
    },
    courseType: {
      type: String,
      enum: ['one-on-one', 'smart-quad'],
    },
    courseDuration: {
      type: Number,
      min: 1,
    },
    totalSessions: {
      type: Number,
      min: 1,
    },
    courseExpiryDate: {
      type: Date,
    },
    // Accessibility and booking permissions
    canBookOneOnOne: {
      type: Boolean,
      default: true,
    },
    canRequestSlots: {
      type: Boolean,
      default: true,
    },
    bookingRestrictions: {
      reason: String,
      restrictedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      restrictedAt: Date,
      expiresAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from returned JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Export the model
export const User = mongoose.model<IUser>('User', userSchema);
