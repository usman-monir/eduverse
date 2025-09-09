import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SmartQuadBatch } from '../models/SmartQuadBatch';
import { SmartQuadSlot } from '../models/SmartQuadSlot';
import { StudentEnrollment } from '../models/StudentEnrollment';
import { User } from '../models/User';

// @desc    Create a new Smart Quad batch
// @route   POST /api/smart-quad-batches
// @access  Private (Admin)
export const createSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      courseType,
      preferredLanguage,
      desiredScore,
    } = req.body;

    // Validate required fields
    if (!name || !preferredLanguage || !desiredScore) {
      res.status(400).json({
        success: false,
        message: 'Name, preferred language, and desired score are required',
      });
      return;
    }

    const batch = new SmartQuadBatch({
      name,
      description,
      courseType: courseType || 'smart-quad',
      preferredLanguage,
      desiredScore,
      createdBy: req.user!._id,
    });

    await batch.save();

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Smart Quad batch created successfully',
    });
  } catch (error) {
    console.error('Create Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating Smart Quad batch',
    });
  }
};

// @desc    Get all Smart Quad batches
// @route   GET /api/smart-quad-batches
// @access  Private (Admin)
export const getSmartQuadBatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const batches = await SmartQuadBatch.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await SmartQuadBatch.countDocuments(filter);

    // Get slot counts and student counts for each batch
    const batchesWithCounts = await Promise.all(
      batches.map(async (batch) => {
        const slotCount = await SmartQuadSlot.countDocuments({ 
          smartQuadBatchId: batch._id, 
          isActive: true 
        });
        const studentCount = await StudentEnrollment.countDocuments({ 
          smartQuadBatchId: batch._id, 
          status: 'active' 
        });

        return {
          ...batch.toObject(),
          slotCount,
          studentCount,
        };
      })
    );

    res.json({
      success: true,
      data: batchesWithCounts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get Smart Quad batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad batches',
    });
  }
};

// @desc    Get Smart Quad batch by ID
// @route   GET /api/smart-quad-batches/:id
// @access  Private
export const getSmartQuadBatchById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await SmartQuadBatch.findById(id)
      .populate('createdBy', 'name email');

    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Get slots and students for this batch
    const [slots, students] = await Promise.all([
      SmartQuadSlot.find({ smartQuadBatchId: id, isActive: true })
        .populate('tutorId', 'name email')
        .sort({ dayOfWeek: 1, timeSlot: 1 }),
      StudentEnrollment.find({ smartQuadBatchId: id })
        .populate('studentId', 'name email')
        .sort({ enrollmentDate: -1 })
    ]);

    res.json({
      success: true,
      data: {
        batch,
        slots,
        students,
      },
    });
  } catch (error) {
    console.error('Get Smart Quad batch by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad batch',
    });
  }
};

// @desc    Update Smart Quad batch
// @route   PUT /api/smart-quad-batches/:id
// @access  Private (Admin)
export const updateSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields
    delete updateData._id;
    delete updateData.createdBy;
    delete updateData.createdAt;

    const batch = await SmartQuadBatch.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    res.json({
      success: true,
      data: batch,
      message: 'Smart Quad batch updated successfully',
    });
  } catch (error) {
    console.error('Update Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating Smart Quad batch',
    });
  }
};

// @desc    Delete Smart Quad batch
// @route   DELETE /api/smart-quad-batches/:id
// @access  Private (Admin)
export const deleteSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await SmartQuadBatch.findById(id);
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Cascade delete: Remove all associated data
    // 1. Delete all student enrollments for this batch
    const deletedEnrollments = await StudentEnrollment.deleteMany({
      smartQuadBatchId: id,
    });

    // 2. Delete all slots for this batch
    const deletedSlots = await SmartQuadSlot.deleteMany({
      smartQuadBatchId: id,
    });

    // 3. Permanently delete the batch
    await SmartQuadBatch.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Smart Quad batch and all associated data deleted successfully',
      deletedData: {
        batch: batch.name,
        enrollments: deletedEnrollments.deletedCount,
        slots: deletedSlots.deletedCount,
      },
    });
  } catch (error) {
    console.error('Delete Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting Smart Quad batch',
    });
  }
};

// @desc    Archive Smart Quad batch
// @route   PUT /api/smart-quad-batches/:id/archive
// @access  Private (Admin)
export const archiveSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await SmartQuadBatch.findById(id);
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Archive the batch
    batch.status = 'archived';
    await batch.save();

    // Also deactivate all slots
    await SmartQuadSlot.updateMany(
      { smartQuadBatchId: id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Smart Quad batch archived successfully',
    });
  } catch (error) {
    console.error('Archive Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while archiving Smart Quad batch',
    });
  }
};

// @desc    Activate Smart Quad batch
// @route   PUT /api/smart-quad-batches/:id/activate
// @access  Private (Admin)
export const activateSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await SmartQuadBatch.findById(id);
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Activate the batch
    batch.status = 'active';
    await batch.save();

    // Also reactivate all slots
    await SmartQuadSlot.updateMany(
      { smartQuadBatchId: id },
      { isActive: true }
    );

    res.json({
      success: true,
      message: 'Smart Quad batch activated successfully',
    });
  } catch (error) {
    console.error('Activate Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while activating Smart Quad batch',
    });
  }
};

// @desc    Permanently delete Smart Quad batch
// @route   DELETE /api/smart-quad-batches/:id/permanent
// @access  Private (Admin)
export const permanentlyDeleteSmartQuadBatch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await SmartQuadBatch.findById(id);
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Cascade delete: Remove all associated data
    // 1. Delete all student enrollments for this batch
    const deletedEnrollments = await StudentEnrollment.deleteMany({
      smartQuadBatchId: id,
    });

    // 2. Delete all slots for this batch
    const deletedSlots = await SmartQuadSlot.deleteMany({
      smartQuadBatchId: id,
    });

    // 3. Permanently delete the batch
    await SmartQuadBatch.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Smart Quad batch and all associated data permanently deleted successfully',
      deletedData: {
        batch: batch.name,
        enrollments: deletedEnrollments.deletedCount,
        slots: deletedSlots.deletedCount,
      },
    });
  } catch (error) {
    console.error('Permanently delete Smart Quad batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while permanently deleting Smart Quad batch',
    });
  }
};
