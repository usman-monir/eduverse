import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  RefreshCw,
  Calendar as CalendarIcon,
  Zap,
  Video,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import {
  getSmartQuadBatchById,
  getBatchEnrollments,
  enrollStudent,
  updateEnrollment,
  extendEnrollment,
  cancelEnrollment,
  getAdminUsers,
  getEnrollmentBookings,
  cancelBooking,
} from '@/services/api';
import { SmartQuadBatch, StudentEnrollment, User } from '@/types';

interface EnrollmentForm {
  studentId: string;
  expiryDate: string;
  totalSessionsAllowed?: number;
}

interface ExtensionForm {
  extensionDays?: number;
  newExpiryDate?: string;
}

const AdminSmartQuadEnrollments = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Utility function to safely get ID from any object
  const getSafeId = (obj: any): string | null => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj.trim() || null;
    if (typeof obj === 'object') {
      return obj._id || obj.id || null;
    }
    return null;
  };
  
  // Utility function to validate if an object has a valid ID
  const hasValidId = (obj: any): boolean => {
    const id = getSafeId(obj);
    return id !== null && id.length > 0;
  };
  
  const [batch, setBatch] = useState<SmartQuadBatch | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<StudentEnrollment | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<(string | { _id: string; id?: string })[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [extending, setExtending] = useState(false);
  
  // Booking management states
  const [showBookingsDialog, setShowBookingsDialog] = useState(false);
  const [selectedEnrollmentForBookings, setSelectedEnrollmentForBookings] = useState<StudentEnrollment | null>(null);
  const [enrollmentBookings, setEnrollmentBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const enrollForm = useForm<EnrollmentForm>({
    defaultValues: {
      studentId: '',
      expiryDate: '',
      totalSessionsAllowed: undefined,
    },
  });

  const extendForm = useForm<ExtensionForm>({
    defaultValues: {
      extensionDays: 30,
      newExpiryDate: '',
    },
  });

  useEffect(() => {
    if (batchId) {
      fetchData();
    }
  }, [batchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, enrollmentsRes, studentsRes] = await Promise.all([
        getSmartQuadBatchById(batchId!),
        getBatchEnrollments(batchId!),
        getAdminUsers({ role: 'student', limit: 500 }),
      ]);

      setBatch(batchRes.data.data.batch || batchRes.data.data);
      
      // Filter out invalid enrollments
      const validEnrollments = (enrollmentsRes.data.data.enrollments || []).filter(enrollment => {
        if (!enrollment || !hasValidId(enrollment) || !enrollment.studentName || !enrollment.studentEmail) {
          console.warn('Filtering out invalid enrollment:', enrollment);
          return false;
        }
        return true;
      });
      setEnrollments(validEnrollments);
      
      // Filter out invalid students
      const validStudents = (studentsRes.data.data || []).filter(student => {
        if (!student || !hasValidId(student) || !student.name || !student.email) {
          console.warn('Filtering out invalid student:', student);
          return false;
        }
        return true;
      });
      setStudents(validStudents);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async (data: EnrollmentForm) => {
    if (!batchId) return;

    // Validate studentId
    if (!data.studentId) {
      toast({
        title: 'Error',
        description: 'Student ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await enrollStudent(batchId, data);
      
      toast({
        title: 'Success',
        description: 'Student enrolled successfully',
      });
      
      setShowEnrollDialog(false);
      enrollForm.reset();
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to enroll student',
        variant: 'destructive',
      });
    }
  };

  const handleBulkEnroll = async () => {
    if (!batchId || selectedStudents.length === 0) return;

    const expiryDate = enrollForm.getValues('expiryDate');
    const totalSessionsAllowed = enrollForm.getValues('totalSessionsAllowed');

    if (!expiryDate) {
      toast({
        title: 'Error',
        description: 'Please set an expiry date for bulk enrollment',
        variant: 'destructive',
      });
      return;
    }

    // Validate all selected student IDs
    const validStudentIds = selectedStudents.filter(id => id && (typeof id === 'string' || typeof id === 'object'));
    if (validStudentIds.length !== selectedStudents.length) {
      toast({
        title: 'Error',
        description: 'Some selected students have invalid IDs',
        variant: 'destructive',
      });
      return;
    }

    try {
      setEnrolling(true);
      for (const studentId of selectedStudents) {
        // Ensure studentId is a valid string
        const cleanStudentId = typeof studentId === 'object' ? (studentId._id || studentId.id) : studentId;
        
        if (!cleanStudentId) {
          console.warn('Skipping student with invalid ID:', studentId);
          continue;
        }
        
        await enrollStudent(batchId, {
          studentId: cleanStudentId,
          expiryDate,
          totalSessionsAllowed,
        });
      }
      
      toast({
        title: 'Success',
        description: `${selectedStudents.length} student(s) enrolled successfully`,
      });
      
      setShowEnrollDialog(false);
      setSelectedStudents([]);
      enrollForm.reset();
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to enroll students',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleExtendEnrollment = async (data: ExtensionForm) => {
    if (!batchId || !selectedEnrollment) return;

    // Validate selectedEnrollment data
    if (!hasValidId(selectedEnrollment) || !selectedEnrollment.studentName) {
      console.warn('Invalid selectedEnrollment data for extendEnrollment:', selectedEnrollment);
      toast({
        title: 'Error',
        description: 'Invalid enrollment data',
        variant: 'destructive',
      });
      return;
    }

    try {
      setExtending(true);
      const enrollmentId = getSafeId(selectedEnrollment);
      await extendEnrollment(batchId, enrollmentId!, data);
      
      toast({
        title: 'Success',
        description: 'Enrollment extended successfully',
      });
      
      setShowExtendDialog(false);
      setSelectedEnrollment(null);
      extendForm.reset();
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to extend enrollment',
        variant: 'destructive',
      });
    } finally {
      setExtending(false);
    }
  };

  const handleCancelEnrollment = async (enrollmentId: string, suspendOnly: boolean = false) => {
    if (!batchId) return;

    // Validate enrollmentId
    if (!enrollmentId || !hasValidId(enrollmentId)) {
      console.warn('Invalid enrollmentId for cancelEnrollment:', enrollmentId);
      toast({
        title: 'Error',
        description: 'Invalid enrollment ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      await cancelEnrollment(batchId, enrollmentId, { suspendOnly });
      
      toast({
        title: 'Success',
        description: `Enrollment ${suspendOnly ? 'suspended' : 'cancelled'} successfully`,
      });
      
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to cancel enrollment',
        variant: 'destructive',
      });
    }
  };

  const handleViewBookings = async (enrollment: StudentEnrollment) => {
    // Validate enrollment data
    if (!enrollment || !hasValidId(enrollment) || !enrollment.studentName) {
      console.warn('Invalid enrollment data for viewBookings:', enrollment);
      toast({
        title: 'Error',
        description: 'Invalid enrollment data',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedEnrollmentForBookings(enrollment);
    setShowBookingsDialog(true);
    setLoadingBookings(true);

    try {
      const enrollmentId = getSafeId(enrollment);
      const response = await getEnrollmentBookings(enrollmentId!);
      setEnrollmentBookings(response.data.data.bookings || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
      setEnrollmentBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCancelSessionBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId, { 
        cancellationReason: 'Cancelled by admin' 
      });

      toast({
        title: 'Success',
        description: 'Session booking cancelled successfully',
      });

      // Refresh bookings
      if (selectedEnrollmentForBookings) {
        handleViewBookings(selectedEnrollmentForBookings);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'booked': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'no-show': return 'outline';
      default: return 'secondary';
    }
  };

  const openExtendDialog = (enrollment: StudentEnrollment) => {
    // Validate enrollment data
    if (!enrollment || !hasValidId(enrollment) || !enrollment.studentName) {
      console.warn('Invalid enrollment data for extendDialog:', enrollment);
      toast({
        title: 'Error',
        description: 'Invalid enrollment data',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedEnrollment(enrollment);
    setShowExtendDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const isExpiringSoon = (expiryDate: string): boolean => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    // Skip enrollments with invalid data
    if (!enrollment || !hasValidId(enrollment) || !enrollment.studentName || !enrollment.studentEmail) {
      console.warn('Enrollment with invalid data found:', enrollment);
      return false;
    }
    
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
    const matchesSearch = enrollment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get available students (not already enrolled)
  const availableStudents = students.filter(student => {
    // Skip students with invalid IDs
    if (!hasValidId(student)) {
      console.warn('Student with invalid ID found:', student);
      return false;
    }
    
    // Get the primary ID (prefer _id, fallback to id)
    const studentId = getSafeId(student);
    
    return !enrollments.some(enrollment => {
      // Skip enrollments with invalid student IDs
      if (!enrollment || !enrollment.studentId) {
        console.warn('Enrollment with invalid studentId found:', enrollment);
        return false;
      }
      
      // Handle both object and string studentId references
      const enrolledStudentId = getSafeId(enrollment.studentId);
      
      // Skip if enrolledStudentId is invalid
      if (!enrolledStudentId) {
        console.warn('Enrollment with invalid enrolledStudentId found:', enrollment);
        return false;
      }
      
      return enrolledStudentId === studentId;
    });
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !batch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <div className="text-lg text-red-600">{error || 'Batch not found'}</div>
            <Button 
              onClick={() => navigate('/admin/smart-quad-batches')} 
              className="mt-4"
            >
              Back to Batches
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/smart-quad-batches')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batches
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{batch.name} - Enrollments</h1>
              <p className="text-muted-foreground">Manage student enrollments and access</p>
            </div>
          </div>
          <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enroll Students</DialogTitle>
                <DialogDescription>
                  Add students to this Smart Quad batch with individual expiry dates
                </DialogDescription>
              </DialogHeader>
              <Form {...enrollForm}>
                <form onSubmit={enrollForm.handleSubmit(handleEnrollStudent)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={enrollForm.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={enrollForm.control}
                      name="totalSessionsAllowed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Limit (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Unlimited"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border rounded-lg p-4">
                    <Label className="text-sm font-medium mb-3 block">Select Students</Label>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {availableStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          All students are already enrolled in this batch
                        </p>
                      ) : (
                        availableStudents
                          .map((student) => {
                            const studentId = getSafeId(student);
                            
                            // Skip students with invalid IDs
                            if (!studentId) {
                              console.warn('Student with invalid ID found in mapping:', student);
                              return null;
                            }
                            
                            return (
                              <div
                                key={studentId}
                                className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50"
                              >
                                <Checkbox
                                  id={studentId}
                                  checked={selectedStudents.some(selected => {
                                    if (typeof selected === 'string') {
                                      return selected === studentId;
                                    } else {
                                      return getSafeId(selected) === studentId;
                                    }
                                  })}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      // Add student with both _id and id for compatibility
                                      const studentToAdd = { _id: studentId, id: studentId };
                                      setSelectedStudents([...selectedStudents, studentToAdd]);
                                    } else {
                                      // Remove student by matching either _id or id
                                      setSelectedStudents(selectedStudents.filter(selected => {
                                        if (typeof selected === 'string') {
                                          return selected !== studentId;
                                        } else {
                                          return getSafeId(selected) !== studentId;
                                        }
                                      }));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={studentId}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-sm text-gray-500">{student.email}</p>
                                  </div>
                                </label>
                              </div>
                            );
                          })
                          .filter(Boolean) // Remove null values
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {selectedStudents.length} student(s) selected
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEnrollDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button"
                        onClick={handleBulkEnroll}
                        disabled={selectedStudents.length === 0 || enrolling}
                      >
                        {enrolling ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          `Enroll Selected (${selectedStudents.length})`
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        {filteredEnrollments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Enrollments Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start by enrolling students in this Smart Quad batch'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowEnrollDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enroll First Student
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEnrollments.map((enrollment) => {
              // Skip enrollments with invalid data
              if (!enrollment || !hasValidId(enrollment) || !enrollment.studentName || !enrollment.studentEmail) {
                console.warn('Skipping enrollment with invalid data:', enrollment);
                return null;
              }
              
              // Get the primary ID (prefer _id, fallback to id)
              const enrollmentId = getSafeId(enrollment);
              
              return (
                <Card key={enrollmentId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="font-medium">{enrollment.studentName}</h3>
                            <p className="text-sm text-gray-500">{enrollment.studentEmail}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 ml-8">
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Status</Label>
                            <div className="mt-1">
                              {getStatusBadge(enrollment.status)}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Enrolled</Label>
                            <p className="text-sm font-medium">
                              {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Expires</Label>
                            <p className={`text-sm font-medium ${
                              isExpiringSoon(enrollment.expiryDate) ? 'text-orange-600' : 
                              new Date(enrollment.expiryDate) < new Date() ? 'text-red-600' : ''
                            }`}>
                              {new Date(enrollment.expiryDate).toLocaleDateString()}
                              {isExpiringSoon(enrollment.expiryDate) && (
                                <AlertCircle className="h-3 w-3 inline ml-1" />
                              )}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Sessions Used</Label>
                            <p className="text-sm font-medium">
                              {enrollment.sessionsUsed}
                              {enrollment.totalSessionsAllowed && ` / ${enrollment.totalSessionsAllowed}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewBookings(enrollment)}
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          View Bookings
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openExtendDialog(enrollment)}
                          disabled={enrollment.status === 'cancelled'}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Extend
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={enrollment.status === 'cancelled'}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Enrollment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel {enrollment.studentName}'s enrollment?
                                This will prevent them from booking new sessions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelEnrollment(enrollmentId, true)}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Suspend
                              </AlertDialogAction>
                              <AlertDialogAction 
                                onClick={() => handleCancelEnrollment(enrollmentId, false)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Extend Dialog */}
        <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Extend Enrollment</DialogTitle>
              <DialogDescription>
                Extend {selectedEnrollment?.studentName}'s access to this Smart Quad batch
              </DialogDescription>
            </DialogHeader>
            <Form {...extendForm}>
              <form onSubmit={extendForm.handleSubmit(handleExtendEnrollment)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={extendForm.control}
                    name="extensionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extend by Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={extendForm.control}
                    name="newExpiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Or Set New Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedEnrollment && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Current Expiry:</strong> {new Date(selectedEnrollment.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExtendDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={extending}>
                    {extending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Extending...
                      </>
                    ) : (
                      'Extend Access'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Bookings Dialog */}
        <Dialog open={showBookingsDialog} onOpenChange={setShowBookingsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Session Bookings - {selectedEnrollmentForBookings?.studentName}
              </DialogTitle>
              <DialogDescription>
                View and manage all session bookings for this student
              </DialogDescription>
            </DialogHeader>

            {loadingBookings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading bookings...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollmentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                    <p className="text-gray-500">This student hasn't booked any sessions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Total Sessions: {enrollmentBookings.length}
                      </h4>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          Booked: {enrollmentBookings.filter(b => b.status === 'booked').length}
                        </Badge>
                        <Badge variant="default">
                          Completed: {enrollmentBookings.filter(b => b.status === 'completed').length}
                        </Badge>
                        <Badge variant="destructive">
                          Cancelled: {enrollmentBookings.filter(b => b.status === 'cancelled').length}
                        </Badge>
                      </div>
                    </div>

                    {enrollmentBookings.map((booking) => (
                      <Card key={booking._id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium">
                                  {new Date(booking.sessionDate).toLocaleDateString()} at{' '}
                                  {booking.smartQuadSlotId?.timeSlot}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {booking.smartQuadSlotId?.dayOfWeek} • {booking.smartQuadSlotId?.duration} min
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">
                                  {booking.smartQuadSlotId?.tutorId?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {booking.smartQuadSlotId?.tutorId?.email}
                                </p>
                              </div>
                            </div>

                            <div>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {booking.status}
                              </Badge>
                            </div>

                            {booking.bookingType === 'weekly' && (
                              <Badge variant="outline">
                                Weekly Package
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {booking.meetingLink && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(booking.meetingLink, '_blank')}
                              >
                                <Video className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            )}

                            {booking.status === 'booked' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Session Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this session booking? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleCancelSessionBooking(booking._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Yes, Cancel Booking
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <strong>Notes:</strong> {booking.notes}
                          </div>
                        )}

                        {booking.cancellationReason && (
                          <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                            <strong>Cancellation Reason:</strong> {booking.cancellationReason}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSmartQuadEnrollments;
