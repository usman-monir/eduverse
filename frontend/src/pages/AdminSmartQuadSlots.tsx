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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
  Calendar,
  Clock,
  Users,
  User as UserIcon,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import {
  getSmartQuadBatchById,
  getSmartQuadSlots,
  createSmartQuadSlot,
  updateSmartQuadSlot,
  deleteSmartQuadSlot,
  getAllTutorsWithSubjects,
} from '@/services/api';
import { SmartQuadBatch, SmartQuadSlot, User } from '@/types';

interface SlotForm {
  tutorId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeSlot: string;
  duration: number;
  maxStudents: number;
  timezone: string;
  effectiveStartDate: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const TIMEZONE_OPTIONS = [
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/Toronto', label: 'America/Toronto (EST)' },
  { value: 'UTC', label: 'UTC' },
];

const AdminSmartQuadSlots = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [batch, setBatch] = useState<SmartQuadBatch | null>(null);
  const [slots, setSlots] = useState<SmartQuadSlot[]>([]);
  const [tutors, setTutors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SmartQuadSlot | null>(null);
  
  // Loading states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const form = useForm<SlotForm>({
    defaultValues: {
      tutorId: '',
      dayOfWeek: 'Monday',
      timeSlot: '10:00',
      duration: 60,
      maxStudents: 4,
      timezone: 'Australia/Sydney',
      effectiveStartDate: new Date().toISOString().split('T')[0],
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
      const [batchRes, slotsRes, tutorsRes] = await Promise.all([
        getSmartQuadBatchById(batchId!),
        getSmartQuadSlots(batchId!),
        getAllTutorsWithSubjects(),
      ]);

      setBatch(batchRes.data.data.batch || batchRes.data.data);
      setSlots(slotsRes.data.data.slots || []);
      setTutors(tutorsRes.data.data || []);
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

  const handleCreateSlot = async (data: SlotForm) => {
    if (!batchId) return;

    try {
      setCreating(true);
      await createSmartQuadSlot(batchId, data);
      
      toast({
        title: 'Success',
        description: 'Slot created successfully',
      });
      
      setShowCreateDialog(false);
      form.reset();
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create slot',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSlot = async (data: SlotForm) => {
    if (!batchId || !editingSlot) return;

    try {
      setUpdating(true);
      const slotId = editingSlot._id || editingSlot.id;
      await updateSmartQuadSlot(batchId, slotId, data);
      
      toast({
        title: 'Success',
        description: 'Slot updated successfully',
      });
      
      setShowEditDialog(false);
      setEditingSlot(null);
      form.reset();
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update slot',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSlot = async (slotId: string, force: boolean = false) => {
    if (!batchId) return;

    try {
      await deleteSmartQuadSlot(batchId, slotId, force);
      
      toast({
        title: 'Success',
        description: 'Slot deactivated successfully',
      });
      
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete slot',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (slot: SmartQuadSlot) => {
    setEditingSlot(slot);
    
    // Extract tutor ID from nested object if needed
    const tutorId = typeof slot.tutorId === 'object' && slot.tutorId !== null 
      ? (slot.tutorId as any)._id || (slot.tutorId as any).id 
      : slot.tutorId;
    
    const formData = {
      tutorId,
      dayOfWeek: slot.dayOfWeek,
      timeSlot: slot.timeSlot,
      duration: slot.duration,
      maxStudents: slot.maxStudents,
      timezone: slot.timezone || 'Australia/Sydney',
      effectiveStartDate: slot.effectiveStartDate ? 
        new Date(slot.effectiveStartDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0],
    };
    
    form.reset(formData);
    setShowEditDialog(true);
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

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  // Group slots by day for better display
  const slotsByDay = slots.reduce((acc: any, slot) => {
    const day = slot.dayOfWeek;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(slot);
    return acc;
  }, {});

  // Sort slots within each day by time
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[day].sort((a: SmartQuadSlot, b: SmartQuadSlot) => 
      a.timeSlot.localeCompare(b.timeSlot)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading slots...</div>
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
              <h1 className="text-3xl font-bold">{batch.name}</h1>
              <p className="text-muted-foreground">Manage weekly time slots for this batch</p>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Slot</DialogTitle>
                <DialogDescription>
                  Add a recurring weekly time slot for this Smart Quad batch
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateSlot)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tutorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tutor *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tutor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tutors.map((tutor) => (
                              <SelectItem key={tutor._id || tutor.id} value={tutor._id || tutor.id}>
                                {tutor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dayOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Week</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeSlot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DURATION_OPTIONS.map((duration) => (
                                <SelectItem key={duration} value={duration.toString()}>
                                  {duration} minutes
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxStudents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Students</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="10" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONE_OPTIONS.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="effectiveStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Slot'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Batch Info */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Language</Label>
                <p className="text-sm text-muted-foreground">{batch.preferredLanguage}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Target Score</Label>
                <p className="text-sm text-muted-foreground">{batch.desiredScore}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                  {batch.status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Slots</Label>
                <p className="text-sm text-muted-foreground">{slots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slots by Day */}
        {slots.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Slots Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create time slots to allow students to book sessions
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Slot
                </Button>
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
                      <Calendar className="h-5 w-5" />
                      {day}
                    </CardTitle>
                    <CardDescription>
                      {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''} scheduled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {daySlots.map((slot) => (
                        <Card key={slot._id || slot.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {getStatusIcon(slot.isActive)}
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    <UserIcon className="h-4 w-4" />
                                    {slot.tutorName}
                                  </h4>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(slot.timeSlot)}
                                    </span>
                                    <span>{slot.duration} minutes</span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      Max {slot.maxStudents} students
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(slot)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate Slot</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to deactivate this slot? This will prevent new bookings but preserve existing ones.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteSlot(slot._id || slot.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Slot</DialogTitle>
              <DialogDescription>
                Update the slot details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateSlot)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tutorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tutor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tutor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tutors.map((tutor) => (
                            <SelectItem key={tutor._id || tutor.id} value={tutor._id || tutor.id}>
                              {tutor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map((duration) => (
                              <SelectItem key={duration} value={duration.toString()}>
                                {duration} minutes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxStudents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Students</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? 'Updating...' : 'Update Slot'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSmartQuadSlots;
