import moment from 'moment-timezone';
import { ISmartQuadSlot } from '../models/SmartQuadSlot';

// Day name to number mapping (ISO 8601: Monday = 1, Sunday = 7)
const DAY_TO_NUMBER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

// Number to day name mapping
const NUMBER_TO_DAY: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export interface SlotDateInfo {
  date: Date;
  localDateString: string; // e.g., "2025-08-18"
  localTimeString: string; // e.g., "10:00"
  utcDate: Date;
  isInPast: boolean;
  dayOfWeek: string;
}

export class DateUtils {
  /**
   * Get the actual date for a slot on a specific week
   */
  static getSlotDateForWeek(
    slot: ISmartQuadSlot,
    weekStartDate: Date,
    timezone?: string
  ): SlotDateInfo {
    const slotTimezone = timezone || slot.timezone;
    const dayNumber = DAY_TO_NUMBER[slot.dayOfWeek];
    
    // Start with the week start date
    const weekStart = moment.tz(weekStartDate, slotTimezone).startOf('isoWeek');
    
    // Get the specific day of the week
    const slotDate = weekStart.clone().isoWeekday(dayNumber);
    
    // Combine with the time slot
    const [hours, minutes] = slot.timeSlot.split(':').map(Number);
    slotDate.hour(hours).minute(minutes).second(0).millisecond(0);
    
    const now = moment.tz(slotTimezone);
    
    return {
      date: slotDate.toDate(),
      localDateString: slotDate.format('YYYY-MM-DD'),
      localTimeString: slotDate.format('HH:mm'),
      utcDate: slotDate.utc().toDate(),
      isInPast: slotDate.isBefore(now),
      dayOfWeek: slot.dayOfWeek,
    };
  }

  /**
   * Get dates for all days of a week in a specific timezone
   */
  static getWeekDates(weekStartDate: Date, timezone: string = 'UTC'): Record<string, Date> {
    const weekStart = moment.tz(weekStartDate, timezone).startOf('isoWeek');
    
    const weekDates: Record<string, Date> = {};
    for (let i = 1; i <= 7; i++) {
      const dayName = NUMBER_TO_DAY[i];
      weekDates[dayName] = weekStart.clone().isoWeekday(i).toDate();
    }
    
    return weekDates;
  }

  /**
   * Get slots with their actual dates for a specific week
   */
  static getSlotsWithDates(
    slots: ISmartQuadSlot[],
    weekStartDate: Date,
    timezone?: string
  ): Array<any> {
    return slots.map(slot => ({
      ...slot.toObject(),
      slotDateInfo: this.getSlotDateForWeek(slot, weekStartDate, timezone),
    }));
  }

  /**
   * Check if a slot is available for booking (not in the past and within effective dates)
   */
  static isSlotAvailableForBooking(
    slot: ISmartQuadSlot,
    targetDate: Date,
    advanceBookingHours: number = 12
  ): { available: boolean; reason?: string } {
    const now = moment.tz(slot.timezone);
    const slotDateTime = moment.tz(targetDate, slot.timezone);
    
    // Check if slot is in the past
    if (slotDateTime.isBefore(now)) {
      return { available: false, reason: 'Slot is in the past' };
    }
    
    // For recurring slots, use a more flexible advance booking rule
    // Only require 1 hour advance booking for better UX
    const hoursUntilSlot = slotDateTime.diff(now, 'hours', true);
    if (hoursUntilSlot < 1) {
      return { 
        available: false, 
        reason: `Must book at least 1 hour in advance` 
      };
    }
    
    // For effective date range, check if the slot pattern is active (not the specific date)
    // The slot is effective if the current date is after the slot's effective start date
    const today = moment.tz(slot.timezone).startOf('day').toDate();
    const effectiveStart = moment.tz(slot.effectiveStartDate, slot.timezone).startOf('day').toDate();
    
    if (today < effectiveStart) {
      return { available: false, reason: 'Slot not yet effective' };
    }
    
    if (slot.effectiveEndDate) {
      const effectiveEnd = moment.tz(slot.effectiveEndDate, slot.timezone).startOf('day').toDate();
      if (today > effectiveEnd) {
        return { available: false, reason: 'Slot no longer effective' };
      }
    }
    
    return { available: true };
  }

  /**
   * Get date range for a week starting from a given date
   */
  static getWeekDateRange(weekStartDate: Date, timezone: string = 'UTC'): {
    startDate: Date;
    endDate: Date;
    weekDates: Record<string, string>; // Day name to date string mapping
  } {
    const weekStart = moment.tz(weekStartDate, timezone).startOf('isoWeek');
    const weekEnd = weekStart.clone().endOf('isoWeek');
    
    const weekDates: Record<string, string> = {};
    for (let i = 1; i <= 7; i++) {
      const dayName = NUMBER_TO_DAY[i];
      weekDates[dayName] = weekStart.clone().isoWeekday(i).format('YYYY-MM-DD');
    }
    
    return {
      startDate: weekStart.toDate(),
      endDate: weekEnd.toDate(),
      weekDates,
    };
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      return moment.tz.zone(timezone) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get current date in a specific timezone
   */
  static getCurrentDate(timezone: string): Date {
    return moment.tz(timezone).toDate();
  }

  /**
   * Convert a date from one timezone to another
   */
  static convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    return moment.tz(date, fromTimezone).tz(toTimezone).toDate();
  }
}

export default DateUtils;
