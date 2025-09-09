import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SmartQuadSlot } from '../models/SmartQuadSlot';
import { SmartQuadBatch } from '../models/SmartQuadBatch';
import { User } from '../models/User';
import { SessionBooking } from '../models/SessionBooking';
import { Types } from 'mongoose';
import { DateUtils } from '../utils/dateUtils';

// @desc    Create a new slot for a Smart Quad batch
// @route   POST /api/smart-quad-batches/:batchId/slots
// @access  Private (Admin)
export const createSmartQuadSlot = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const {
      tutorId,
      dayOfWeek,
      timeSlot,
      duration,
      maxStudents,
      timezone = 'Australia/Sydney',
      effectiveStartDate,
    } = req.body;

    // Validate required fields
    if (!tutorId || !dayOfWeek || !timeSlot) {
      res.status(400).json({
        success: false,
        message: 'Tutor, day of week, and time slot are required',
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

    // Verify tutor exists and is a tutor
    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      res.status(400).json({
        success: false,
        message: 'Invalid tutor ID',
      });
      return;
    }

    // Check if slot already exists for this tutor at this time
    const existingSlot = await SmartQuadSlot.findOne({
      tutorId,
      dayOfWeek,
      timeSlot,
    });

    if (existingSlot) {
      res.status(400).json({
        success: false,
        message: `Tutor ${tutor.name} already has a slot on ${dayOfWeek} at ${timeSlot}`,
      });
      return;
    }

    // Validate timezone if provided
    if (!DateUtils.isValidTimezone(timezone)) {
      res.status(400).json({
        success: false,
        message: 'Invalid timezone format',
      });
      return;
    }

    const slot = new SmartQuadSlot({
      smartQuadBatchId: batchId,
      tutorId,
      tutorName: tutor.name,
      dayOfWeek,
      timeSlot,
      duration: duration || 60,
      maxStudents: maxStudents || 4,
      timezone,
      effectiveStartDate: effectiveStartDate ? new Date(effectiveStartDate) : new Date(),
      createdBy: req.user!._id,
    });

    await slot.save();

    const populatedSlot = await SmartQuadSlot.findById(slot._id)
      .populate('tutorId', 'name email')
      .populate('smartQuadBatchId', 'name');

    res.status(201).json({
      success: true,
      data: populatedSlot,
      message: 'Smart Quad slot created successfully',
    });
  } catch (error) {
    console.error('Create Smart Quad slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating Smart Quad slot',
    });
  }
};

// @desc    Get all slots for a Smart Quad batch
// @route   GET /api/smart-quad-batches/:batchId/slots
// @access  Private
export const getSmartQuadSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { isActive = true } = req.query;

    console.log('DEBUG: getSmartQuadSlots - batchId:', batchId);
    console.log('DEBUG: getSmartQuadSlots - isActive:', isActive, 'type:', typeof isActive);
    console.log('DEBUG: getSmartQuadSlots - req.query:', req.query);

    const filter: any = { smartQuadBatchId: new Types.ObjectId(batchId) };
    
    // Fix the isActive filtering logic
    if (isActive === 'false') {
      filter.isActive = false;
    } else {
      filter.isActive = true; // Default to true for active slots
    }

    console.log('DEBUG: getSmartQuadSlots - filter:', filter);

    const slots = await SmartQuadSlot.find(filter)
      .populate('tutorId', 'name email')
      .populate('smartQuadBatchId', 'name')
      .sort({ dayOfWeek: 1, timeSlot: 1 });

    console.log('DEBUG: getSmartQuadSlots - found slots:', slots.length);
    
    // Debug: Check all slots in DB for this batch
    const allSlots = await SmartQuadSlot.find({});
    console.log('DEBUG: All slots in DB:', allSlots.length);
    allSlots.forEach(slot => {
      console.log('DEBUG: Slot batchId:', slot.smartQuadBatchId, 'matches:', slot.smartQuadBatchId.toString() === batchId);
    });

    // Group slots by day for easier frontend consumption
    const slotsByDay = slots.reduce((acc: any, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(slot);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        slots,
        slotsByDay,
      },
    });
  } catch (error) {
    console.error('Get Smart Quad slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad slots',
    });
  }
};

// @desc    Get available slots for booking (with current capacity and actual dates)
// @route   GET /api/smart-quad-batches/:batchId/slots/available
// @access  Private (Student, Admin, Tutor)
export const getAvailableSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { date, week, timezone = 'Australia/Sydney' } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (date) {
      // Get slots for a specific date
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (week) {
      // Get slots for a specific week
      startDate = new Date(week as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else {
      // Default: current week (Monday to Sunday)
      const now = DateUtils.getCurrentDate(timezone as string);
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate days to get to Monday of current week
      let daysToMonday;
      if (dayOfWeek === 0) { // Sunday
        daysToMonday = 1; // Next Monday
      } else if (dayOfWeek === 1) { // Monday
        daysToMonday = 0; // Today
      } else { // Tuesday to Saturday
        daysToMonday = 8 - dayOfWeek; // Next Monday
      }
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() + daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      
      console.log('DEBUG Week Calculation:', {
        now: now,
        dayOfWeek: dayOfWeek,
        daysToMonday: daysToMonday,
        startDate: startDate,
        endDate: endDate,
        timezone: timezone
      });
    }

    // Get week date information for display
    const weekDateRange = DateUtils.getWeekDateRange(startDate, timezone as string);

    const slots = await SmartQuadSlot.find({
      smartQuadBatchId: batchId,
      isActive: true,
    })
      .populate('tutorId', 'name email')
      .sort({ dayOfWeek: 1, timeSlot: 1 });

    // Get slots with their actual dates and availability info
    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        // Get the actual date for this slot in the requested week
        const slotDateInfo = DateUtils.getSlotDateForWeek(slot, startDate, timezone as string);
        
        // Check if slot is available for booking (considering advance booking rules)
        const bookingAvailability = DateUtils.isSlotAvailableForBooking(slot, slotDateInfo.date);

        // Get booking count for this specific slot date
        const bookedCount = await SessionBooking.countDocuments({
          smartQuadSlotId: slot._id,
          sessionDate: {
            $gte: new Date(slotDateInfo.localDateString + 'T00:00:00.000Z'),
            $lt: new Date(slotDateInfo.localDateString + 'T23:59:59.999Z'),
          },
          status: { $in: ['booked', 'completed'] },
        });

        const availableSpots = slot.maxStudents - bookedCount;
        const isAvailable = availableSpots > 0 && bookingAvailability.available && !slotDateInfo.isInPast;

        // Debug logging
        console.log('DEBUG Slot Availability:', {
          slotId: slot._id,
          dayOfWeek: slot.dayOfWeek,
          timeSlot: slot.timeSlot,
          timezone: slot.timezone,
          slotDateInfo: slotDateInfo,
          bookingAvailability: bookingAvailability,
          availableSpots: availableSpots,
          isInPast: slotDateInfo.isInPast,
          finalAvailable: isAvailable
        });

        return {
          ...slot.toObject(),
          // Add calculated date information
          slotDateInfo,
          // Booking availability
          bookedCount,
          availableSpots,
          isAvailable,
          bookingAvailability,
          // Additional info for frontend
          actualDate: slotDateInfo.date,
          localDate: slotDateInfo.localDateString,
          localTime: slotDateInfo.localTimeString,
          isPast: slotDateInfo.isInPast,
        };
      })
    );

    // Group slots by day with actual dates for easier frontend consumption
    const slotsByDay = slotsWithAvailability.reduce((acc: any, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) {
        acc[day] = {
          date: slot.localDate,
          slots: [],
        };
      }
      acc[day].slots.push(slot);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        slots: slotsWithAvailability,
        slotsByDay,
        dateRange: { 
          startDate, 
          endDate,
          weekDates: weekDateRange.weekDates,
        },
        timezone: timezone,
      },
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available slots',
    });
  }
};

// @desc    Update a Smart Quad slot
// @route   PUT /api/smart-quad-batches/:batchId/slots/:slotId
// @access  Private (Admin)
export const updateSmartQuadSlot = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId, slotId } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields
    delete updateData._id;
    delete updateData.smartQuadBatchId;
    delete updateData.createdBy;
    delete updateData.createdAt;

    // If updating tutor, validate and update tutor name
    if (updateData.tutorId) {
      const tutor = await User.findById(updateData.tutorId);
      if (!tutor || tutor.role !== 'tutor') {
        res.status(400).json({
          success: false,
          message: 'Invalid tutor ID',
        });
        return;
      }
      updateData.tutorName = tutor.name;
    }

    const slot = await SmartQuadSlot.findOneAndUpdate(
      { _id: slotId, smartQuadBatchId: batchId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('tutorId', 'name email')
      .populate('smartQuadBatchId', 'name');

    if (!slot) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad slot not found',
      });
      return;
    }

    res.json({
      success: true,
      data: slot,
      message: 'Smart Quad slot updated successfully',
    });
  } catch (error) {
    console.error('Update Smart Quad slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating Smart Quad slot',
    });
  }
};

// @desc    Delete/Deactivate a Smart Quad slot
// @route   DELETE /api/smart-quad-batches/:batchId/slots/:slotId
// @access  Private (Admin)
export const deleteSmartQuadSlot = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId, slotId } = req.params;
    const { force } = req.query;

    const slot = await SmartQuadSlot.findOne({
      _id: slotId,
      smartQuadBatchId: batchId,
    });

    if (!slot) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad slot not found',
      });
      return;
    }

    // Check if there are future bookings
    const futureBookings = await SessionBooking.countDocuments({
      smartQuadSlotId: slotId,
      sessionDate: { $gt: new Date() },
      status: { $in: ['booked'] },
    });

    if (futureBookings > 0 && force !== 'true') {
      res.status(400).json({
        success: false,
        message: `Cannot delete slot with ${futureBookings} future booking(s). Use force=true to override.`,
        futureBookings,
      });
      return;
    }

    if (force === 'true') {
      // Cancel all future bookings
      await SessionBooking.updateMany(
        {
          smartQuadSlotId: slotId,
          sessionDate: { $gt: new Date() },
          status: 'booked',
        },
        {
          status: 'cancelled',
          cancellationReason: 'Slot deleted by admin',
          cancelledBy: req.user!._id,
          cancelledAt: new Date(),
        }
      );
    }

    // Deactivate the slot instead of deleting
    slot.isActive = false;
    await slot.save();

    res.json({
      success: true,
      message: 'Smart Quad slot deactivated successfully',
      cancelledBookings: futureBookings,
    });
  } catch (error) {
    console.error('Delete Smart Quad slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting Smart Quad slot',
    });
  }
};
