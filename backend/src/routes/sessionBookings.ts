import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  bookSession,
  getMyBookings,
  cancelBooking,
  completeSession,
  getSlotBookings,
  getEnrollmentBookings,
  getBatchBookings,
} from '../controllers/sessionBookingController';
import { getMyEnrollments } from '../controllers/studentEnrollmentController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Session booking routes
router.route('/')
  .post(authorize('student'), bookSession);

router.route('/my-bookings')
  .get(authorize('student'), getMyBookings);

router.route('/my-enrollments')
  .get(authorize('student'), getMyEnrollments);

router.route('/:bookingId/cancel')
  .put(authorize('student', 'admin'), cancelBooking);

router.route('/:bookingId/complete')
  .put(authorize('admin', 'tutor'), completeSession);

// Slot-specific booking routes (for tutors and admins)
router.route('/slots/:slotId/bookings')
  .get(authorize('admin', 'tutor'), getSlotBookings);

// Admin routes for viewing bookings
router.route('/enrollment/:enrollmentId')
  .get(authorize('admin'), getEnrollmentBookings);

router.route('/batch/:batchId')
  .get(authorize('admin'), getBatchBookings);

export default router;
