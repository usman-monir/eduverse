import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SessionBooking } from '../models/SessionBooking';
import { SmartQuadSlot } from '../models/SmartQuadSlot';
import { StudentEnrollment } from '../models/StudentEnrollment';
import { generateGoogleMeetLink } from '../utils/googleMeet';
import { DateUtils } from '../utils/dateUtils';

// @desc    Book a session (single or weekly)
// @route   POST /api/session-bookings
// @access  Private (Student)
export const bookSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      smartQuadSlotId,
      sessionDate,
      bookingType = 'single',
      weeklyBookingEndDate,
    } = req.body;

    const studentId = req.user!._id;

    // Validate required fields
    if (!smartQuadSlotId || !sessionDate) {
      res.status(400).json({
        success: false,
        message: 'Slot ID and session date are required',
      });
      return;
    }

    // Get the slot details
    const slot = await SmartQuadSlot.findById(smartQuadSlotId)
      .populate('smartQuadBatchId')
      .populate('tutorId', 'name email');

    if (!slot || !slot.isActive) {
      res.status(404).json({
        success: false,
        message: 'Slot not found or inactive',
      });
      return;
    }

    // Check if student is enrolled in this batch
    const enrollment = await StudentEnrollment.findOne({
      smartQuadBatchId: slot.smartQuadBatchId,
      studentId,
      status: 'active',
    }).populate('studentId', 'name email');

    if (!enrollment) {
      res.status(403).json({
        success: false,
        message: 'You are not enrolled in this Smart Quad batch',
      });
      return;
    }

    // Check if enrollment has expired
    if (enrollment.expiryDate <= new Date()) {
      res.status(403).json({
        success: false,
        message: 'Your enrollment has expired',
      });
      return;
    }

    const requestedDate = new Date(sessionDate);

    // Validate session date and booking rules using timezone-aware utility (1 hour advance)
    const bookingAvailability = DateUtils.isSlotAvailableForBooking(slot, requestedDate, 1);
    
    if (!bookingAvailability.available) {
      res.status(400).json({
        success: false,
        message: bookingAvailability.reason,
      });
      return;
    }

    // Validate the day matches the slot day (using timezone-aware calculation)
    const slotDateInfo = DateUtils.getSlotDateForWeek(slot, requestedDate, slot.timezone);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const requestedDay = dayNames[requestedDate.getDay()];
    
    if (requestedDay !== slot.dayOfWeek) {
      res.status(400).json({
        success: false,
        message: `This slot is only available on ${slot.dayOfWeek}s`,
      });
      return;
    }

    if (bookingType === 'single') {
      // Book single session
      const booking = await bookSingleSession(
        slot,
        enrollment,
        requestedDate
      );
      
      res.status(201).json({
        success: true,
        data: booking,
        message: 'Session booked successfully',
      });
    } else if (bookingType === 'weekly') {
      // Book weekly sessions
      if (!weeklyBookingEndDate) {
        res.status(400).json({
          success: false,
          message: 'Weekly booking end date is required for weekly bookings',
        });
        return;
      }

      const endDate = new Date(weeklyBookingEndDate);
      if (endDate > enrollment.expiryDate) {
        res.status(400).json({
          success: false,
          message: 'Weekly booking end date cannot exceed your enrollment expiry',
        });
        return;
      }

      const bookings = await bookWeeklySessions(
        slot,
        enrollment,
        requestedDate,
        endDate
      );

      // Provide more detailed response based on booking results
      if (bookings.length === 0) {
        res.status(200).json({
          success: true,
          data: bookings,
          message: 'No new sessions were booked. You may already have sessions booked for this week or all available slots are full.',
          warning: true
        });
      } else {
        res.status(201).json({
          success: true,
          data: bookings,
          message: `${bookings.length} weekly session${bookings.length > 1 ? 's' : ''} booked successfully`,
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid booking type. Must be "single" or "weekly"',
      });
      return;
    }
  } catch (error: any) {
    console.error('Book session error:', error);
    
    // Handle duplicate booking error
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'You have already booked this session for the selected date',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while booking session',
    });
  }
};

// Helper function to book a single session
async function bookSingleSession(
  slot: any,
  enrollment: any,
  sessionDate: Date
): Promise<any> {
  // Check if slot is available for this date
  const existingBooking = await SessionBooking.findOne({
    smartQuadSlotId: slot._id,
    studentEnrollmentId: enrollment._id,
    sessionDate,
    status: { $in: ['booked', 'completed'] },
  });

  if (existingBooking) {
    throw new Error('You have already booked this slot for this date');
  }

  // Check slot capacity
  const currentBookings = await SessionBooking.countDocuments({
    smartQuadSlotId: slot._id,
    sessionDate,
    status: { $in: ['booked', 'completed'] },
  });

  if (currentBookings >= slot.maxStudents) {
    throw new Error('This slot is fully booked for the selected date');
  }

  // Check session limit if set
  if (enrollment.totalSessionsAllowed && 
      enrollment.sessionsUsed >= enrollment.totalSessionsAllowed) {
    throw new Error('You have reached your session limit');
  }

  // Create session datetime
  const [hours, minutes] = slot.timeSlot.split(':').map(Number);
  const sessionDateTime = new Date(sessionDate);
  sessionDateTime.setHours(hours, minutes, 0, 0);

  // Generate meeting link with proper title
  const batchName = (slot.smartQuadBatchId as any)?.name || 'Smart Quad Session';
  const studentName = (enrollment.studentId as any)?.name || 'Student';
  const meetingTitle = `${batchName} - ${studentName} with ${slot.tutorName}`;
  
  console.log('Meeting title info:', { batchName, studentName, tutorName: slot.tutorName, meetingTitle });
  
  const { meetLink } = await generateGoogleMeetLink(
    meetingTitle,
    sessionDateTime.toISOString(),
    new Date(sessionDateTime.getTime() + slot.duration * 60 * 1000).toISOString()
  );

  // Create booking
  const booking = new SessionBooking({
    smartQuadSlotId: slot._id,
    studentEnrollmentId: enrollment._id,
    sessionDate: sessionDateTime,
    meetingLink: meetLink,
    bookingType: 'single',
  });

  await booking.save();

  // Update enrollment sessions used
  enrollment.sessionsUsed += 1;
  await enrollment.save();

  return await SessionBooking.findById(booking._id)
    .populate({
      path: 'smartQuadSlotId',
      populate: {
        path: 'tutorId',
        select: 'name email'
      }
    })
    .populate('studentEnrollmentId');
}

// Helper function to book weekly sessions (same time slot for every day of the week)
async function bookWeeklySessions(
  slot: any,
  enrollment: any,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const bookings = [];
  
  // Find all slots for the same tutor, same time, same batch (different days)
  const weeklySlots = await SmartQuadSlot.find({
    smartQuadBatchId: slot.smartQuadBatchId,
    tutorId: slot.tutorId,
    timeSlot: slot.timeSlot,
    isActive: true,
  }).populate('tutorId', 'name email');

  console.log(`Found ${weeklySlots.length} slots for weekly booking:`, 
    weeklySlots.map(s => `${s.dayOfWeek} ${s.timeSlot}`));

  // For each day of the week, try to book the same time slot
  for (const weeklySlot of weeklySlots) {
    const targetDate = new Date(startDate);
    
    // Find the first occurrence of this day in the week starting from startDate
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(weeklySlot.dayOfWeek);
    const startDayIndex = targetDate.getDay();
    
    // Calculate days to add to reach the target day within the same week
    let daysToAdd = targetDayIndex - startDayIndex;
    if (daysToAdd < 0) daysToAdd += 7; // Next week if day has passed
    
    targetDate.setDate(startDate.getDate() + daysToAdd);
    
    // Only book if the date is within our range, not in the past, and within enrollment expiry
    if (targetDate <= endDate && targetDate >= new Date() && targetDate <= enrollment.expiryDate) {
      
      // Check if student already has ANY booking for this day (one session per day rule)
      const dayStart = new Date(targetDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const dayEnd = new Date(targetDate.toISOString().split('T')[0] + 'T23:59:59.999Z');
      
      const existingDayBooking = await SessionBooking.findOne({
        studentEnrollmentId: enrollment._id,
        sessionDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ['booked', 'completed'] },
      });

      if (existingDayBooking) {
        console.log(`Skipping ${weeklySlot.dayOfWeek} ${targetDate.toDateString()} - student already has a session that day`);
        continue;
      }

      // Check session limit
      if (enrollment.totalSessionsAllowed && 
          enrollment.sessionsUsed >= enrollment.totalSessionsAllowed) {
        console.log(`Skipping ${weeklySlot.dayOfWeek} - session limit reached`);
        break;
      }

      try {
        // Use the existing bookSingleSession function but for different days
        const booking = await bookSingleSession(weeklySlot, enrollment, targetDate);
        booking.bookingType = 'weekly';
        booking.weeklyBookingEndDate = endDate;
        await booking.save();
        
        bookings.push(booking);
        console.log(`✅ Booked ${weeklySlot.dayOfWeek} ${weeklySlot.timeSlot} for ${targetDate.toDateString()}`);
        
      } catch (error: any) {
        console.error(`Failed to book ${weeklySlot.dayOfWeek} ${targetDate.toDateString()}:`, error.message);
      }
    } else {
      console.log(`Skipping ${weeklySlot.dayOfWeek} ${targetDate.toDateString()} - outside valid date range`);
    }
  }

  console.log(`Weekly booking complete: ${bookings.length} sessions booked out of ${weeklySlots.length} possible slots`);
  
  if (bookings.length === 0) {
    console.log('No sessions were booked. Possible reasons:');
    console.log('- Student already has sessions booked for those days');
    console.log('- All slots are full');
    console.log('- Session limit reached');
    console.log('- Target dates are in the past or outside valid range');
  }
  
  return bookings;
}

// @desc    Get student's bookings
// @route   GET /api/session-bookings/my-bookings
// @access  Private (Student)
export const getMyBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const { status, page = 1, limit = 20, upcoming } = req.query;

    // Get student's enrollments
    const enrollments = await StudentEnrollment.find({ 
      studentId, 
      status: 'active' 
    }).select('_id');
    
    const enrollmentIds = enrollments.map(e => e._id);

    const filter: any = { studentEnrollmentId: { $in: enrollmentIds } };
    
    if (status) filter.status = status;
    if (upcoming === 'true') {
      filter.sessionDate = { $gte: new Date() };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const bookings = await SessionBooking.find(filter)
      .populate({
        path: 'smartQuadSlotId',
        populate: [
          { path: 'tutorId', select: 'name email' },
          { path: 'smartQuadBatchId', select: 'name description' }
        ]
      })
      .populate('studentEnrollmentId')
      .sort({ sessionDate: upcoming === 'true' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await SessionBooking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
    });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/session-bookings/:bookingId/cancel
// @access  Private (Student, Admin)
export const cancelBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const booking = await SessionBooking.findById(bookingId)
      .populate('studentEnrollmentId');

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check permission
    if (userRole === 'student') {
      const enrollment = booking.studentEnrollmentId as any;
      if (enrollment.studentId.toString() !== (userId as any).toString()) {
        res.status(403).json({
          success: false,
          message: 'You can only cancel your own bookings',
        });
        return;
      }

      // Check cancellation deadline (12 hours before session)
      const twelveHoursBefore = new Date(booking.sessionDate.getTime() - 12 * 60 * 60 * 1000);
      if (new Date() > twelveHoursBefore) {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel booking less than 12 hours before the session',
        });
        return;
      }
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
      return;
    }

    if (booking.status === 'completed') {
      res.status(400).json({
        success: false,
        message: 'Cannot cancel completed sessions',
      });
      return;
    }

    booking.status = 'cancelled';
    booking.cancelledBy = userId as any;
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();

    await booking.save();

    // Decrement sessions used for the enrollment
    const enrollment = await StudentEnrollment.findById(booking.studentEnrollmentId);
    if (enrollment && enrollment.sessionsUsed > 0) {
      enrollment.sessionsUsed -= 1;
      await enrollment.save();
    }

    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking',
    });
  }
};

// @desc    Mark session as completed
// @route   PUT /api/session-bookings/:bookingId/complete
// @access  Private (Admin, Tutor)
export const completeSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { notes, attendanceMarked = true } = req.body;

    const booking = await SessionBooking.findById(bookingId)
      .populate({
        path: 'smartQuadSlotId',
        populate: { path: 'tutorId' }
      });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check permission for tutors
    if (req.user!.role === 'tutor') {
      const slot = booking.smartQuadSlotId as any;
      if (slot.tutorId._id.toString() !== (req.user!._id as any).toString()) {
        res.status(403).json({
          success: false,
          message: 'You can only complete your own sessions',
        });
        return;
      }
    }

    if (booking.status === 'completed') {
      res.status(400).json({
        success: false,
        message: 'Session is already completed',
      });
      return;
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Cannot complete cancelled sessions',
      });
      return;
    }

    booking.status = 'completed';
    booking.attendanceMarked = attendanceMarked;
    if (notes) booking.notes = notes;

    await booking.save();

    res.json({
      success: true,
      data: booking,
      message: 'Session marked as completed',
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing session',
    });
  }
};

// @desc    Get bookings for a specific slot (Admin/Tutor view)
// @route   GET /api/smart-quad-slots/:slotId/bookings
// @access  Private (Admin, Tutor)
export const getSlotBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slotId } = req.params;
    const { date, week, status } = req.query;

    const slot = await SmartQuadSlot.findById(slotId);
    if (!slot) {
      res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
      return;
    }

    // Check permission for tutors
    if (req.user!.role === 'tutor' && slot.tutorId.toString() !== (req.user!._id as any).toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only view bookings for your own slots',
      });
      return;
    }

    const filter: any = { smartQuadSlotId: slotId };
    
    if (status) filter.status = status;

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.sessionDate = { $gte: targetDate, $lt: nextDay };
    } else if (week) {
      const startDate = new Date(week as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      filter.sessionDate = { $gte: startDate, $lt: endDate };
    }

    const bookings = await SessionBooking.find(filter)
      .populate({
        path: 'studentEnrollmentId',
        populate: { path: 'studentId', select: 'name email phone' }
      })
      .sort({ sessionDate: 1 });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('Get slot bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching slot bookings',
    });
  }
};

// @desc    Get bookings for a specific enrollment (Admin view)
// @route   GET /api/session-bookings/enrollment/:enrollmentId
// @access  Private (Admin)
export const getEnrollmentBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { enrollmentId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    const filter: any = { studentEnrollmentId: enrollmentId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await SessionBooking.find(filter)
      .populate({
        path: 'smartQuadSlotId',
        populate: { path: 'tutorId', select: 'name email' }
      })
      .populate({
        path: 'studentEnrollmentId',
        populate: { path: 'studentId', select: 'name email phone' }
      })
      .sort({ sessionDate: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await SessionBooking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get enrollment bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollment bookings',
    });
  }
};

// @desc    Get all bookings for a Smart Quad batch (Admin view)
// @route   GET /api/session-bookings/batch/:batchId
// @access  Private (Admin)
export const getBatchBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { status, date, limit = 50, page = 1 } = req.query;

    // Get all slots for this batch
    const slots = await SmartQuadSlot.find({ smartQuadBatchId: batchId });
    const slotIds = slots.map(slot => slot._id);

    const filter: any = { smartQuadSlotId: { $in: slotIds } };
    if (status) filter.status = status;

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.sessionDate = { $gte: targetDate, $lt: nextDay };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await SessionBooking.find(filter)
      .populate({
        path: 'smartQuadSlotId',
        populate: { path: 'tutorId', select: 'name email' }
      })
      .populate({
        path: 'studentEnrollmentId',
        populate: { path: 'studentId', select: 'name email phone' }
      })
      .sort({ sessionDate: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await SessionBooking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get batch bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching batch bookings',
    });
  }
};
