import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createSmartQuadBatch,
  getSmartQuadBatches,
  getSmartQuadBatchById,
  updateSmartQuadBatch,
  deleteSmartQuadBatch,
  archiveSmartQuadBatch,
  activateSmartQuadBatch,
  permanentlyDeleteSmartQuadBatch,
} from '../controllers/smartQuadBatchController';
import {
  createSmartQuadSlot,
  getSmartQuadSlots,
  getAvailableSlots,
  updateSmartQuadSlot,
  deleteSmartQuadSlot,
} from '../controllers/smartQuadSlotController';
import {
  enrollStudent,
  getBatchEnrollments,
  updateEnrollment,
  extendEnrollment,
  cancelEnrollment,
} from '../controllers/studentEnrollmentController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Smart Quad Batch routes
router.route('/')
  .post(authorize('admin'), createSmartQuadBatch)
  .get(authorize('admin'), getSmartQuadBatches);

router.route('/:id')
  .get(authorize('admin', 'tutor', 'student'), getSmartQuadBatchById)
  .put(authorize('admin'), updateSmartQuadBatch)
  .delete(authorize('admin'), deleteSmartQuadBatch);

// Additional batch management routes
router.route('/:id/archive')
  .put(authorize('admin'), archiveSmartQuadBatch);

router.route('/:id/activate')
  .put(authorize('admin'), activateSmartQuadBatch);

router.route('/:id/permanent')
  .delete(authorize('admin'), permanentlyDeleteSmartQuadBatch);

// Slot management routes
router.route('/:batchId/slots')
  .post(authorize('admin'), createSmartQuadSlot)
  .get(authorize('admin', 'tutor', 'student'), getSmartQuadSlots);

router.route('/:batchId/slots/available')
  .get(authorize('admin', 'tutor', 'student'), getAvailableSlots);

router.route('/:batchId/slots/:slotId')
  .put(authorize('admin'), updateSmartQuadSlot)
  .delete(authorize('admin'), deleteSmartQuadSlot);

// Student enrollment routes
router.route('/:batchId/enrollments')
  .post(authorize('admin'), enrollStudent)
  .get(authorize('admin'), getBatchEnrollments);

router.route('/:batchId/enrollments/:enrollmentId')
  .put(authorize('admin'), updateEnrollment);

router.route('/:batchId/enrollments/:enrollmentId/extend')
  .put(authorize('admin'), extendEnrollment);

router.route('/:batchId/enrollments/:enrollmentId/cancel')
  .put(authorize('admin'), cancelEnrollment);

export default router;
