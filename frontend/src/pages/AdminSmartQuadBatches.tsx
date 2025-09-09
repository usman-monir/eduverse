import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { 
  getSmartQuadBatches, 
  createSmartQuadBatch, 
  updateSmartQuadBatch, 
  deleteSmartQuadBatch,
  archiveSmartQuadBatch,
  activateSmartQuadBatch,
  permanentlyDeleteSmartQuadBatch
} from '@/services/api';
import { SmartQuadBatch } from '@/types';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Calendar, 
  Edit, 
  Trash2, 
  Search,
  RefreshCw,
  BookOpen,
  Target,
  Globe,
  Settings,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface SmartQuadBatchForm {
  name: string;
  description: string;
  courseType: 'smart-quad' | 'one-on-one';
  preferredLanguage: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore: number;
}

const AdminSmartQuadBatches = () => {
  const [batches, setBatches] = useState<SmartQuadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<SmartQuadBatch | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<SmartQuadBatchForm>({
    defaultValues: {
      name: '',
      description: '',
      courseType: 'smart-quad',
      preferredLanguage: 'English',
      desiredScore: 75,
    },
    mode: 'onChange',
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await getSmartQuadBatches({ limit: 100 });
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch Smart Quad batches:', error);
      toast({
        title: "Error",
        description: "Failed to load Smart Quad batches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
      inactive: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Inactive' },
      archived: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Archived' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  const getLanguageBadge = (language: string) => {
    return <Badge variant="outline" className="text-xs">{language}</Badge>;
  };

  const filteredBatches = batches.filter(batch => {
    const matchesStatus = filterStatus === 'all' || batch.status === filterStatus;
    const matchesSearch = (batch.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (batch.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateBatch = async (data: SmartQuadBatchForm) => {
    try {
      await createSmartQuadBatch(data);
      toast({
        title: "Success",
        description: "Smart Quad batch created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      fetchBatches();
    } catch (error: any) {
      console.error('Create Smart Quad batch error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create Smart Quad batch",
        variant: "destructive"
      });
    }
  };

  const handleUpdateBatch = async (data: SmartQuadBatchForm) => {
    if (!editingBatch) return;
    
    const batchId = editingBatch._id || editingBatch.id;
    
    try {
      await updateSmartQuadBatch(batchId, data);
      toast({
        title: "Success",
        description: "Smart Quad batch updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingBatch(null);
      form.reset();
      fetchBatches();
    } catch (error: any) {
      console.error('Update Smart Quad batch error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update Smart Quad batch",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      await deleteSmartQuadBatch(id);
      toast({
        title: "Success",
        description: "Smart Quad batch archived successfully",
      });
      fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to archive Smart Quad batch",
        variant: "destructive"
      });
    }
  };

  const handleArchiveBatch = async (id: string) => {
    setActionLoading(id);
    try {
      await archiveSmartQuadBatch(id);
      toast({
        title: "Success",
        description: "Smart Quad batch archived successfully",
      });
      fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to archive Smart Quad batch",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateBatch = async (id: string) => {
    setActionLoading(id);
    try {
      await activateSmartQuadBatch(id);
      toast({
        title: "Success",
        description: "Smart Quad batch activated successfully",
      });
      fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to activate Smart Quad batch",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentlyDeleteBatch = async (id: string) => {
    setActionLoading(id);
    try {
      await permanentlyDeleteSmartQuadBatch(id);
      toast({
        title: "Success",
        description: "Smart Quad batch permanently deleted successfully",
      });
      fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to permanently delete Smart Quad batch",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (batch: SmartQuadBatch) => {
    setEditingBatch(batch);
    
    const formData = {
      name: batch.name,
      description: batch.description || '',
      courseType: batch.courseType,
      preferredLanguage: batch.preferredLanguage,
      desiredScore: batch.desiredScore,
    };
    
    form.reset(formData);
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
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
            <h1 className="text-3xl font-bold text-gray-900">Smart Quad Batches</h1>
            <p className="text-gray-600 mt-2">Create and manage Smart Quad batches with slot-based scheduling</p>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Batch Management Guide:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• <strong>Archive:</strong> Deactivates batch and slots (can be reactivated later)</li>
                  <li>• <strong>Activate:</strong> Reactivates archived batch and slots</li>
                  <li>• <strong>Delete:</strong> Permanently removes batch and ALL associated data (slots, enrollments)</li>
                  <li>• <strong>Note:</strong> Delete will cascade remove all related data automatically</li>
                </ul>
              </div>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Smart Quad Batch</DialogTitle>
                <DialogDescription>
                  Create a new batch container for organizing Smart Quad slots
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateBatch)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Advanced PTE Batch A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Advanced level PTE preparation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="Hindi">Hindi</SelectItem>
                              <SelectItem value="Punjabi">Punjabi</SelectItem>
                              <SelectItem value="Nepali">Nepali</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="desiredScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Score</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="90" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="courseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="smart-quad">Smart Quad</SelectItem>
                            <SelectItem value="one-on-one">One-on-One</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Batch</Button>
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
                  placeholder="Search batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchBatches}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Batches List */}
        <div className="grid gap-6">
          {filteredBatches.map((batch) => (
            <Card key={batch.id || batch._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      {batch.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {batch.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(batch.status)}
                    <div className="flex gap-1">
                      <Link to={`/admin/smart-quad-batches/${batch._id || batch.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(batch)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* Status Management Buttons */}
                      {batch.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-yellow-600 border-yellow-400 hover:bg-yellow-50"
                          onClick={() => handleArchiveBatch(batch._id || batch.id)}
                          disabled={actionLoading === (batch._id || batch.id)}
                        >
                          {actionLoading === (batch._id || batch.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Archive'
                          )}
                        </Button>
                      )}
                      
                      {batch.status === 'archived' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-400 hover:bg-green-50"
                          onClick={() => handleActivateBatch(batch._id || batch.id)}
                          disabled={actionLoading === (batch._id || batch.id)}
                        >
                          {actionLoading === (batch._id || batch.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Activate'
                          )}
                        </Button>
                      )}
                      
                      {/* Permanent Delete Button - Now always available with cascade deletion */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-400 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to <strong>delete</strong> "{batch.name}"? 
                              This will also delete:
                              <ul className="mt-2 list-disc list-inside space-y-1">
                                <li>All associated slots ({batch.slotCount || 0} slots)</li>
                                <li>All student enrollments ({batch.studentCount || 0} students)</li>
                                <li>The batch itself</li>
                              </ul>
                              <strong className="text-red-600">This action cannot be undone!</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteBatch(batch._id || batch.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Batch
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    {getLanguageBadge(batch.preferredLanguage)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Score: {batch.desiredScore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{batch.slotCount || 0} slots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{batch.studentCount || 0} students</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Link to={`/admin/smart-quad-batches/${batch._id || batch.id}/slots`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage Slots
                        </Button>
                      </Link>
                      <Link to={`/admin/smart-quad-batches/${batch._id || batch.id}/enrollments`}>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-1" />
                          Enrollments
                        </Button>
                      </Link>
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(batch.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredBatches.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Smart Quad batches found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Create your first Smart Quad batch to get started'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Batch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Smart Quad Batch</DialogTitle>
              <DialogDescription>
                Update the Smart Quad batch details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateBatch)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Punjabi">Punjabi</SelectItem>
                            <SelectItem value="Nepali">Nepali</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desiredScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Score</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="90" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="smart-quad">Smart Quad</SelectItem>
                          <SelectItem value="one-on-one">One-on-One</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Batch</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSmartQuadBatches;
