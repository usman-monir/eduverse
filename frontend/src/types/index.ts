export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  avatar: string;
  phone?: string;
  grade?: string;
  subjects?: string[];
  accessTill?: string;
  // Student-specific fields
  preferredLanguage?: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore?: number;
  examDeadline?: string;
  courseType?: 'one-on-one' | 'smart-quad';
  courseDuration?: number;
  totalSessions?: number;
  courseExpiryDate?: string;
  // Accessibility and booking permissions
  canBookOneOnOne?: boolean;
  canRequestSlots?: boolean;
  bookingRestrictions?: {
    reason?: string;
    restrictedBy?: string;
    restrictedAt?: string;
    expiresAt?: string;
  };
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx';
  uploadedBy: string;
  uploadedAt: string;
  subject: string;
  accessLevel: 'all' | 'student' | 'tutor';
}
type Student = {
  studentId: string;
  studentName?: string;
};


export interface ClassSession {
  _id?: string;
  id: string;
  subject: string;
  tutor: string;
  tutorId?: string;
  tutorName: string;

  date: string;
  time: string;
  duration: string;
  status: 'available' | 'booked' | 'completed' | 'pending' | 'approved' | 'cancelled';
  studentId?: string;
  meetingLink?: string;
  description?: string;
  type?: 'admin_created' | 'tutor_created' | 'slot_request' | 'smart_quad';
  students: Student[];
  smartQuadId?: string;
  sessionNumber?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// Smart Quad Batch Types
export interface SmartQuadBatch {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  courseType: 'smart-quad' | 'one-on-one';
  preferredLanguage: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore: number;
  status: 'active' | 'inactive' | 'archived';
  createdBy: string | { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  // Additional computed fields
  slotCount?: number;
  studentCount?: number;
}

// Smart Quad Slot Types
export interface SmartQuadSlot {
  id: string;
  _id?: string;
  smartQuadBatchId: string | SmartQuadBatch;
  tutorId: string | { _id: string; name: string; email: string };
  tutorName: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeSlot: string; // "HH:MM" format
  duration: number; // in minutes
  maxStudents: number;
  timezone: string; // e.g., "Asia/Kolkata", "UTC"
  effectiveStartDate: string;
  effectiveEndDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Additional computed fields for availability (from available slots API)
  slotDateInfo?: {
    date: string;
    localDateString: string;
    localTimeString: string;
    utcDate: string;
    isInPast: boolean;
    dayOfWeek: string;
  };
  bookedCount?: number;
  availableSpots?: number;
  isAvailable?: boolean;
  bookingAvailability?: {
    available: boolean;
    reason?: string;
  };
  actualDate?: string;
  localDate?: string;
  localTime?: string;
  isPast?: boolean;
}

// Student Enrollment Types
export interface StudentEnrollment {
  id: string;
  _id?: string;
  smartQuadBatchId: string | SmartQuadBatch;
  studentId: string | { _id: string; name: string; email: string; phone?: string };
  studentName: string;
  studentEmail: string;
  enrollmentDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  totalSessionsAllowed?: number;
  sessionsUsed: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Session Booking Types
export interface SessionBooking {
  id: string;
  _id?: string;
  smartQuadSlotId: string | SmartQuadSlot;
  studentEnrollmentId: string | StudentEnrollment;
  sessionDate: string;
  status: 'booked' | 'completed' | 'cancelled' | 'no-show';
  meetingLink?: string;
  bookedAt: string;
  bookingType: 'single' | 'weekly';
  weeklyBookingEndDate?: string;
  attendanceMarked: boolean;
  notes?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export interface NotificationStats {
  expiringStudents: number;
  activeSmartQuads: number;
  studentsInSmartQuads: number;
  notificationTypes: {
    courseExpiry: string;
    smartQuadAssignment: string;
    smartQuadRemoval: string;
    smartQuadCancellation: string;
    sessionCancellation: string;
  };
}

export interface NotificationResponse {
  totalStudents: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: any[];
}
