import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { StudentEnrollment } from '../models/StudentEnrollment';
import { SmartQuadBatch } from '../models/SmartQuadBatch';
import { User } from '../models/User';
import EmailService from '../services/emailService';

// @desc    Enroll a student in a Smart Quad batch
// @route   POST /api/smart-quad-batches/:batchId/enrollments
// @access  Private (Admin)
export const enrollStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const {
      studentId,
      expiryDate,
      totalSessionsAllowed,
    } = req.body;

    // Validate required fields
    if (!studentId || !expiryDate) {
      res.status(400).json({
        success: false,
        message: 'Student ID and expiry date are required',
      });
      return;
    }

    // Verify batch exists
    const batch = await SmartQuadBatch.findById(batchId);
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Verify student exists and is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
      return;
    }

    // Check if student is already enrolled
    const existingEnrollment = await StudentEnrollment.findOne({
      smartQuadBatchId: batchId,
      studentId,
    });

    if (existingEnrollment) {
      res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this batch',
        enrollment: existingEnrollment,
      });
      return;
    }

    // Validate expiry date is in the future
    const expiryDateTime = new Date(expiryDate);
    if (expiryDateTime <= new Date()) {
      res.status(400).json({
        success: false,
        message: 'Expiry date must be in the future',
      });
      return;
    }

    const enrollment = new StudentEnrollment({
      smartQuadBatchId: batchId,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      expiryDate: expiryDateTime,
      totalSessionsAllowed,
      createdBy: req.user!._id,
    });

    await enrollment.save();

    const populatedEnrollment = await StudentEnrollment.findById(enrollment._id)
      .populate('studentId', 'name email phone')
      .populate('smartQuadBatchId', 'name description');

    // Send enrollment notification email
    try {
      await EmailService.sendSmartQuadEnrollment({
        studentEmail: student.email,
        studentName: student.name,
        batchName: batch.name,
        expiryDate: expiryDateTime,
        enrollmentDate: new Date(),
      });
    } catch (emailError) {
      console.error('Failed to send enrollment email:', emailError);
    }

    res.status(201).json({
      success: true,
      data: populatedEnrollment,
      message: 'Student enrolled successfully',
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling student',
    });
  }
};

// @desc    Get all enrollments for a Smart Quad batch
// @route   GET /api/smart-quad-batches/:batchId/enrollments
// @access  Private
export const getBatchEnrollments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = { smartQuadBatchId: batchId };
    if (status) filter.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const enrollments = await StudentEnrollment.find(filter)
      .populate('studentId', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await StudentEnrollment.countDocuments(filter);

    // Get enrollment statistics
    const stats = await StudentEnrollment.aggregate([
      { $match: { smartQuadBatchId: batchId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = stats.reduce((acc: any, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        enrollments,
        stats: statusCounts,
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get batch enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollments',
    });
  }
};

// @desc    Get student's enrollments (for student dashboard)
// @route   GET /api/my-enrollments
// @access  Private (Student)
export const getMyEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const studentId = req.user!._id;

    const enrollments = await StudentEnrollment.find({ studentId })
      .populate('smartQuadBatchId', 'name description preferredLanguage desiredScore')
      .sort({ enrollmentDate: -1 });

    // Get active enrollments that haven't expired
    const activeEnrollments = enrollments.filter(
      enrollment => enrollment.status === 'active' && enrollment.expiryDate > new Date()
    );

    res.json({
      success: true,
      data: {
        enrollments,
        activeCount: activeEnrollments.length,
      },
    });
  } catch (error) {
    console.error('Get my enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollments',
    });
  }
};

// @desc    Update student enrollment
// @route   PUT /api/smart-quad-batches/:batchId/enrollments/:enrollmentId
// @access  Private (Admin)
export const updateEnrollment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId, enrollmentId } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields
    delete updateData._id;
    delete updateData.smartQuadBatchId;
    delete updateData.studentId;
    delete updateData.enrollmentDate;
    delete updateData.createdBy;
    delete updateData.createdAt;

    const enrollment = await StudentEnrollment.findOneAndUpdate(
      { _id: enrollmentId, smartQuadBatchId: batchId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('studentId', 'name email phone')
      .populate('smartQuadBatchId', 'name description');

    if (!enrollment) {
      res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
      return;
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Enrollment updated successfully',
    });
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating enrollment',
    });
  }
};

// @desc    Extend enrollment expiry
// @route   PUT /api/smart-quad-batches/:batchId/enrollments/:enrollmentId/extend
// @access  Private (Admin)
export const extendEnrollment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId, enrollmentId } = req.params;
    const { extensionDays, newExpiryDate } = req.body;

    const enrollment = await StudentEnrollment.findOne({
      _id: enrollmentId,
      smartQuadBatchId: batchId,
    }).populate('studentId', 'name email');

    if (!enrollment) {
      res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
      return;
    }

    let newExpiry: Date;

    if (newExpiryDate) {
      newExpiry = new Date(newExpiryDate);
    } else if (extensionDays) {
      newExpiry = new Date(enrollment.expiryDate);
      newExpiry.setDate(newExpiry.getDate() + parseInt(extensionDays));
    } else {
      res.status(400).json({
        success: false,
        message: 'Either extensionDays or newExpiryDate is required',
      });
      return;
    }

    // Validate new expiry is in the future
    if (newExpiry <= new Date()) {
      res.status(400).json({
        success: false,
        message: 'New expiry date must be in the future',
      });
      return;
    }

    const oldExpiry = enrollment.expiryDate;
    enrollment.expiryDate = newExpiry;
    enrollment.status = 'active'; // Reactivate if was expired

    await enrollment.save();

    // Send extension notification email
    try {
      await EmailService.sendEnrollmentExtension({
        studentEmail: (enrollment.studentId as any).email,
        studentName: (enrollment.studentId as any).name,
        batchName: enrollment.smartQuadBatchId.toString(),
        oldExpiryDate: oldExpiry,
        newExpiryDate: newExpiry,
      });
    } catch (emailError) {
      console.error('Failed to send extension email:', emailError);
    }

    res.json({
      success: true,
      data: enrollment,
      message: 'Enrollment extended successfully',
    });
  } catch (error) {
    console.error('Extend enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while extending enrollment',
    });
  }
};

// @desc    Cancel/Suspend enrollment
// @route   PUT /api/smart-quad-batches/:batchId/enrollments/:enrollmentId/cancel
// @access  Private (Admin)
export const cancelEnrollment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId, enrollmentId } = req.params;
    const { reason, suspendOnly } = req.body;

    const enrollment = await StudentEnrollment.findOne({
      _id: enrollmentId,
      smartQuadBatchId: batchId,
    }).populate('studentId', 'name email');

    if (!enrollment) {
      res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
      return;
    }

    enrollment.status = suspendOnly ? 'suspended' : 'cancelled';
    await enrollment.save();

    // Cancel future bookings for this enrollment
    // This will be implemented in the booking controller

    res.json({
      success: true,
      data: enrollment,
      message: `Enrollment ${suspendOnly ? 'suspended' : 'cancelled'} successfully`,
    });
  } catch (error) {
    console.error('Cancel enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling enrollment',
    });
  }
};
