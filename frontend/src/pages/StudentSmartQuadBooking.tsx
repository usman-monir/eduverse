import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
  Calendar,
  Clock,
  Users,
  User as UserIcon,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Target,
  Globe,
  RefreshCw,
  Zap,
  CalendarDays,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getMyEnrollments,
  getAvailableSlots,
  bookSession,
  getMyBookings,
  cancelBooking,
} from '@/services/api';
import { StudentEnrollment, SmartQuadSlot, SessionBooking } from '@/types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'];

const StudentSmartQuadBooking = () => {
  const { toast } = useToast();
  
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SmartQuadSlot[]>([]);
  const [myBookings, setMyBookings] = useState<SessionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<StudentEnrollment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SmartQuadSlot | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingType, setBookingType] = useState<'single' | 'weekly'>('single');
  const [weeklyEndDate, setWeeklyEndDate] = useState('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchMyEnrollments();
    fetchMyBookings();
  }, []);

  const fetchMyEnrollments = async () => {
    try {
      const response = await getMyEnrollments();
      const activeEnrollments = (response.data.data.enrollments || []).filter(
        (enrollment: StudentEnrollment) => enrollment.status === 'active' && new Date(enrollment.expiryDate) > new Date()
      );
      setEnrollments(activeEnrollments);
      
      // Auto-select first enrollment if available
      if (activeEnrollments.length > 0) {
        setSelectedEnrollment(activeEnrollments[0]);
        fetchAvailableSlots(activeEnrollments[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch enrollments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your enrollments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (enrollment: StudentEnrollment) => {
    try {
      const batchId = typeof enrollment.smartQuadBatchId === 'object' 
        ? (enrollment.smartQuadBatchId as any)._id || (enrollment.smartQuadBatchId as any).id
        : enrollment.smartQuadBatchId;
      
      // Get current date and find the next Monday for the week parameter
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      let daysToNextMonday;
      if (dayOfWeek === 0) { // Sunday
        daysToNextMonday = 1; // Tomorrow is Monday
      } else if (dayOfWeek === 1) { // Monday
        daysToNextMonday = 0; // Today is Monday
      } else { // Tuesday to Saturday
        daysToNextMonday = 8 - dayOfWeek; // Days until next Monday
      }
      
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysToNextMonday);
      
      // Set to UTC midnight to avoid timezone confusion
      const utcNextMonday = new Date(Date.UTC(
        nextMonday.getFullYear(),
        nextMonday.getMonth(),
        nextMonday.getDate(),
        0, 0, 0, 0
      ));
      
      console.log('Frontend Week Calculation:', {
        now: now.toISOString(),
        nowLocal: now.toLocaleDateString(),
        dayOfWeek: dayOfWeek,
        daysToNextMonday: daysToNextMonday,
        nextMonday: nextMonday.toISOString(),
        utcNextMonday: utcNextMonday.toISOString(),
        nextMondayLocal: nextMonday.toLocaleDateString(),
        calculation: `${now.getDate()} + ${daysToNextMonday} = ${now.getDate() + daysToNextMonday}`
      });

      const response = await getAvailableSlots(batchId, { 
        week: utcNextMonday.toISOString(),
        timezone: 'Australia/Sydney'
      });
      const slots = response.data?.data?.slots || [];
      setAvailableSlots(slots);
      console.log('Fetched available slots:', slots.length);
    } catch (error: any) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]); // Don't let fetch errors break the page
      toast({
        title: 'Error',
        description: 'Failed to load available slots',
        variant: 'destructive',
      });
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await getMyBookings({ upcoming: true });
      const bookings = response.data?.data || [];
      setMyBookings(bookings);
      console.log('Fetched bookings:', bookings.length);
    } catch (error: any) {
      console.error('Failed to fetch bookings:', error);
      // Don't let booking fetch errors break the page
      setMyBookings([]);
    }
  };

  const handleEnrollmentChange = (enrollmentId: string) => {
    const enrollment = enrollments.find(e => (e._id || e.id) === enrollmentId);
    if (enrollment) {
      setSelectedEnrollment(enrollment);
      fetchAvailableSlots(enrollment);
    }
  };

  // Helper function to calculate week end dates
  const getWeekEndDate = (weeks: number): string => {
    const startDate = new Date(bookingDate || new Date());
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeks * 7) - 1); // -1 to include the start date
    
    // Ensure it doesn't exceed enrollment expiry
    if (selectedEnrollment) {
      const enrollmentExpiry = new Date(selectedEnrollment.expiryDate);
      if (endDate > enrollmentExpiry) {
        return enrollmentExpiry.toISOString().split('T')[0];
      }
    }
    
    return endDate.toISOString().split('T')[0];
  };

  // Helper function to check if a duration option is valid based on enrollment expiry
  const isWeekOptionValid = (weeks: number): boolean => {
    if (!selectedEnrollment || !bookingDate) return false;
    
    const startDate = new Date(bookingDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeks * 7) - 1);
    
    const enrollmentExpiry = new Date(selectedEnrollment.expiryDate);
    
    // Check if there's at least 3 days overlap to make it worthwhile
    const minimumValidEndDate = new Date(startDate);
    minimumValidEndDate.setDate(startDate.getDate() + 3);
    
    return endDate <= enrollmentExpiry && minimumValidEndDate <= enrollmentExpiry;
  };

  const openBookingDialog = (slot: SmartQuadSlot) => {
    setSelectedSlot(slot);
    
    // Use the backend-calculated localDate for accurate date setting
    const defaultDate = slot.localDate || slot.slotDateInfo?.localDateString;
    
    if (defaultDate) {
      setBookingDate(defaultDate);
    } else {
      // Fallback: Set default booking date to next occurrence of the slot's day
      const today = new Date();
      const targetDay = DAYS_OF_WEEK.indexOf(slot.dayOfWeek);
      const todayDay = today.getDay();
      const daysUntilNext = targetDay <= todayDay ? 7 - todayDay + targetDay : targetDay - todayDay;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilNext);
      setBookingDate(nextDate.toISOString().split('T')[0]);
    }
    
    // Reset weekly end date
    setWeeklyEndDate('');
    
    console.log('Opening booking dialog for slot:', {
      dayOfWeek: slot.dayOfWeek,
      localDate: slot.localDate,
      slotDateInfo: slot.slotDateInfo,
      defaultDate: defaultDate,
      finalBookingDate: slot.localDate || defaultDate
    });
    
    setShowBookingDialog(true);
  };

  const handleBookSession = async () => {
    if (!selectedSlot || !selectedEnrollment || !bookingDate) return;
    
    // Validate weekly booking has duration selected
    if (bookingType === 'weekly' && !weeklyEndDate) {
      toast({
        title: 'Error',
        description: 'Please select a duration for weekly booking',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBooking(true);
      
      const bookingData = {
        smartQuadSlotId: selectedSlot._id || selectedSlot.id,
        sessionDate: bookingDate,
        bookingType,
        ...(bookingType === 'weekly' && { weeklyBookingEndDate: weeklyEndDate }),
      };

      const response = await bookSession(bookingData);
      
      // Handle different response types
      if (response.data && response.data.warning) {
        toast({
          title: 'Booking Result',
          description: response.data.message || 'No new sessions were booked.',
          variant: 'default', // Warning style - user should be aware but it's not an error
        });
      } else if (response.data && response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message || `Session${bookingType === 'weekly' ? 's' : ''} booked successfully!`,
        });
      } else {
        // Fallback for unexpected response structure
        toast({
          title: 'Booking Complete',
          description: 'Booking request processed.',
        });
      }
      
      // Always close dialog and refresh data regardless of booking outcome
      setShowBookingDialog(false);
      setSelectedSlot(null);
      setBookingDate('');
      setWeeklyEndDate('');
      setBookingType('single');
      
      try {
        fetchMyBookings();
        if (selectedEnrollment) {
          fetchAvailableSlots(selectedEnrollment);
        }
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Don't show error to user, just log it
      }
    } catch (error: any) {
      console.error('Booking error:', error); // Debug log
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to book session',
        variant: 'destructive',
      });
      
      // Don't close dialog on error, let user try again
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId, { reason: 'Cancelled by student' });
      
      toast({
        title: 'Success',
        description: 'Booking cancelled successfully',
      });
      
      fetchMyBookings();
      if (selectedEnrollment) {
        fetchAvailableSlots(selectedEnrollment);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      booked: { color: 'bg-blue-100 text-blue-800', label: 'Upcoming' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'no-show': { color: 'bg-orange-100 text-orange-800', label: 'No Show' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.booked;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const isCancellable = (booking: SessionBooking): boolean => {
    const sessionDateTime = new Date(booking.sessionDate);
    const now = new Date();
    const timeDiff = sessionDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return booking.status === 'booked' && hoursDiff > 12;
  };

  const groupSlotsByDay = (slots: SmartQuadSlot[]) => {
    return slots.reduce((acc: any, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(slot);
      return acc;
    }, {});
  };

  const slotsByDay = groupSlotsByDay(availableSlots);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (enrollments.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Active Enrollments</h3>
          <p className="text-gray-600 mb-4">
            You don't have any active Smart Quad enrollments. Contact your admin to get enrolled.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Quad Booking</h1>
            <p className="text-gray-600 mt-2">Book sessions with your enrolled Smart Quad batches</p>
          </div>
          <div className="flex items-center gap-4">
            <Select 
              value={selectedEnrollment?._id || selectedEnrollment?.id || ''} 
              onValueChange={handleEnrollmentChange}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {enrollments.map((enrollment) => {
                  const batch = typeof enrollment.smartQuadBatchId === 'object' 
                    ? enrollment.smartQuadBatchId 
                    : null;
                  return (
                    <SelectItem key={enrollment._id || enrollment.id} value={enrollment._id || enrollment.id}>
                      {batch ? (batch as any).name : 'Smart Quad Batch'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedEnrollment && (
          <>
            {/* Enrollment Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Current Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-blue-700 font-medium">Target Score</p>
                      <p className="text-blue-600">
                        {typeof selectedEnrollment.smartQuadBatchId === 'object' 
                          ? (selectedEnrollment.smartQuadBatchId as any).desiredScore || 'N/A'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-blue-700 font-medium">Language</p>
                      <p className="text-blue-600">
                        {typeof selectedEnrollment.smartQuadBatchId === 'object' 
                          ? (selectedEnrollment.smartQuadBatchId as any).preferredLanguage || 'N/A'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-blue-700 font-medium">Expires</p>
                      <p className="text-blue-600">{new Date(selectedEnrollment.expiryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-blue-700 font-medium">Sessions Used</p>
                      <p className="text-blue-600">
                        {selectedEnrollment.sessionsUsed}
                        {selectedEnrollment.totalSessionsAllowed && ` / ${selectedEnrollment.totalSessionsAllowed}`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="book" className="space-y-6">
              <TabsList>
                <TabsTrigger value="book">Book Sessions</TabsTrigger>
                <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value="book" className="space-y-6">
                {/* Available Slots */}
                {Object.keys(slotsByDay).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Available Slots</h3>
                        <p className="text-gray-600">
                          No time slots are available for this batch. Please contact your admin.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySlots = slotsByDay[day] || [];
                      if (daySlots.length === 0) return null;

                      return (
                        <Card key={day}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <CalendarDays className="h-5 w-5" />
                              {day}
                            </CardTitle>
                            <CardDescription>
                              {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''} available
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {daySlots.map((slot) => (
                                <Card key={slot._id || slot.id} className="hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium flex items-center gap-2">
                                          <UserIcon className="h-4 w-4" />
                                          {slot.tutorName}
                                        </h4>
                                        <Badge variant={slot.isAvailable ? 'default' : 'secondary'}>
                                          {slot.availableSpots || 0} spots
                                        </Badge>
                                      </div>
                                      
                                      <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3" />
                                          <span>{formatTime(slot.timeSlot)} ({slot.duration} min)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Users className="h-3 w-3" />
                                          <span>Max {slot.maxStudents} students</span>
                                        </div>
                                      </div>

                                      <Button
                                        className="w-full"
                                        onClick={() => openBookingDialog(slot)}
                                        disabled={!slot.isAvailable || (slot.availableSpots || 0) === 0}
                                      >
                                        Book Session
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-bookings" className="space-y-4">
                {myBookings.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Upcoming Bookings</h3>
                        <p className="text-gray-600">
                          You don't have any upcoming session bookings.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  myBookings.map((booking) => (
                    <Card key={booking._id || booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-medium">
                                {typeof booking.smartQuadSlotId === 'object' 
                                  ? (booking.smartQuadSlotId as any).tutorName || 'Tutor'
                                  : 'Session'}
                              </h3>
                              {getStatusBadge(booking.status)}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(booking.sessionDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {typeof booking.smartQuadSlotId === 'object' 
                                    ? formatTime((booking.smartQuadSlotId as any).timeSlot || '00:00')
                                    : 'Time TBD'}
                                </span>
                              </div>
                              {booking.bookingType === 'weekly' && (
                                <Badge variant="outline" className="text-xs">Weekly</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {booking.meetingLink && booking.status === 'booked' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(booking.meetingLink, '_blank')}
                              >
                                <Video className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            )}
                            
                            {isCancellable(booking) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this booking? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelBooking(booking._id || booking.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Cancel Booking
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Session</DialogTitle>
              <DialogDescription>
                Book a session with {selectedSlot?.tutorName} on {selectedSlot?.dayOfWeek}s
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  max={selectedEnrollment ? selectedEnrollment.expiryDate.split('T')[0] : ''}
                />
              </div>

              <div>
                <Label>Booking Type</Label>
                <Select value={bookingType} onValueChange={(value: 'single' | 'weekly') => setBookingType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Session</SelectItem>
                    <SelectItem value="weekly">
                      Weekly Package (Same time, all days)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {bookingType === 'weekly' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Books the same time slot ({selectedSlot?.timeSlot}) with {selectedSlot?.tutorName} for every available day of the week. Max 1 session per day.
                  </p>
                )}
              </div>

              {bookingType === 'weekly' && (
                <div>
                  <Label>Weekly Package Duration</Label>
                  <Select 
                    value={weeklyEndDate} 
                    onValueChange={(value) => setWeeklyEndDate(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {isWeekOptionValid(1) && (
                        <SelectItem value={getWeekEndDate(1)}>
                          This Week Only (7 days)
                        </SelectItem>
                      )}
                      {isWeekOptionValid(2) && (
                        <SelectItem value={getWeekEndDate(2)}>
                          Next 2 Weeks (14 days)
                        </SelectItem>
                      )}
                      {isWeekOptionValid(3) && (
                        <SelectItem value={getWeekEndDate(3)}>
                          Next 3 Weeks (21 days)
                        </SelectItem>
                      )}
                      {isWeekOptionValid(4) && (
                        <SelectItem value={getWeekEndDate(4)}>
                          Next 4 Weeks (28 days)
                        </SelectItem>
                      )}
                      {!isWeekOptionValid(1) && (
                        <SelectItem value="" disabled>
                          No valid duration options available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Will book all available days within the selected period
                    {selectedEnrollment && (
                      <span className="block mt-1">
                        Your enrollment expires on: {new Date(selectedEnrollment.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {selectedSlot && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800">Session Details</h4>
                  <div className="mt-2 space-y-1 text-sm text-blue-700">
                    <p><strong>Time:</strong> {formatTime(selectedSlot.timeSlot)}</p>
                    <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                    <p><strong>Day:</strong> {selectedSlot.dayOfWeek}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBookSession} 
                  disabled={booking || !bookingDate || (bookingType === 'weekly' && !weeklyEndDate)}
                >
                  {booking ? 'Booking...' : `Book ${bookingType === 'weekly' ? 'Weekly Package' : 'Session'}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentSmartQuadBooking;
