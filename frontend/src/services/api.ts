import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Add interceptor to attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors (401, 403) and user not found errors
    if (error.response?.status === 401) {
      // Unauthorized - token is invalid or expired
      localStorage.removeItem('token');
      
      // Dispatch a custom event to notify the app about authentication failure
      window.dispatchEvent(new CustomEvent('auth:tokenExpired', {
        detail: { 
          message: 'Your session has expired. Please log in again.',
          status: error.response?.status
        }
      }));
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      localStorage.removeItem('token');
      
      window.dispatchEvent(new CustomEvent('auth:tokenExpired', {
        detail: { 
          message: 'Access denied. Please log in with an account that has the required permissions.',
          status: error.response?.status
        }
      }));
    } else if (error.response?.status === 404 && error.config?.url?.includes('/auth/me')) {
      // User profile not found - likely deleted
      localStorage.removeItem('token');
      
      window.dispatchEvent(new CustomEvent('auth:userDeleted', {
        detail: { 
          message: 'Your account has been deleted. Please contact an administrator.',
          status: error.response?.status
        }
      }));
    }
    
    return Promise.reject(error);
  }
);

export const registerStudent = async (data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  grade: string;
  subjects: string[];
}) => {
  return api.post('/auth/register', {
    ...data,
    role: 'student',
  });
};

export const registerTutor = async (data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  subjects: string[];
  experience: string;
  qualifications: string;
}) => {
  return api.post('/auth/register', {
    ...data,
    role: 'tutor',
  });
};

export const login = async (email: string, password: string) => {
  return api.post('/auth/login', { email, password });
};

export const getProfile = async () => {
  return api.get('/auth/me');
};

export const updateProfile = async (data: {
  name?: string;
  phone?: string;
  subjects?: string[];
  experience?: string;
  avatar?: string;
}) => {
  return api.put('/auth/me', data);
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  return api.put('/auth/change-password', data);
};

export const getStudents = async () => {
  return api.get('/admin/users', {
    params: { role: 'student', limit: 100 },
  });
};

export const getStudyMaterials = async (params: any = {}) => {
  return api.get('/study-materials', { params });
};

export const getStudyMaterialById = async (id: string) => {
  return api.get(`/study-materials/${id}`);
};


export const uploadStudyMaterial = async (formData: FormData) => {
  return api.post('/study-materials', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getStudyMaterialCollections = async () => {
  return api.get('/study-materials/collections');
};

export const updateStudyMaterial = async (id: string, data: any) => {
  return api.put(`/study-materials/${id}`, data);
};


export const deleteStudyMaterial = async (id: string) => {
  return api.delete(`/study-materials/${id}`);
};

// Get study material file URL for viewing
export const getStudyMaterialFile = async (id: string) => {
  return api.get(`/study-materials/${id}/file`);
};

// Get study material thumbnail
export const getStudyMaterialThumbnail = async (id: string) => {
  return api.get(`/study-materials/${id}/thumbnail`);
};

// Get study material download URL
export const getStudyMaterialDownloadUrl = async (id: string) => {
  return api.get(`/study-materials/${id}/download`);
};


// Session APIs
export const getSessions = async (params: any = {}) => {
  return api.get('/sessions', { params });
};

export const getSessionById = async (sessionId: string) => {
  return api.get(`/sessions/${sessionId}`);
};

export const createSession = async (data: any) => {
  return api.post('/sessions', data);
};

export const updateSession = async (sessionId: string, data: any) => {
  return api.put(`/sessions/${sessionId}`, data);
};

// export const bookSession = async (sessionId: string, data: any) => {
//   return api.put(`/sessions/${sessionId}/book`, data);
// };

export const cancelSession = async (sessionId: string) => {
  return api.put(`/sessions/${sessionId}/cancel`);
};
 
export const updateSessionStatus = async (
  sessionId: string,
  status: string
) => {
  return api.put(`/sessions/${sessionId}/status`, { status });
};

export const deleteSession = async (sessionId: string) => {
  return api.delete(`/sessions/${sessionId}`);
};

export const getAvailableTutors = async () => {
  return api.get('/sessions/tutors/available');
};

// New Session APIs
export const getMySessions = async (params: any = {}) => {
  return api.get('/sessions/my', { params });
};

export const createSessionSlotRequest = async (data: any) => {
  return api.post('/sessions/request', data);
};

export const approveSlotRequest = async (sessionId: string, approved: boolean, notes?: string) => {
  return api.put(`/sessions/${sessionId}/approve`, { approved, notes });
};

// WhatsApp Templates APIs
export const getWhatsAppTemplates = async () => {
  return api.get('/whatsapp/templates');
};

export const updateWhatsAppTemplate = async (id: string, data: any) => {
  return api.put(`/whatsapp/templates/${id}`, data);
};

export const createWhatsAppTemplate = async (data: any) => {
  return api.post('/whatsapp/templates', data);
};

export const deleteWhatsAppTemplate = async (id: string) => {
  return api.delete(`/whatsapp/templates/${id}`);
};

export const getAdminUsers = async (params: any = {}) => {
  return api.get('/admin/users', { params });
};

export const getAdminUserById = async (id: string) => {
  return api.get(`/admin/users/${id}`);
};

export const deleteUser = async (userId: string) => {
  return api.delete(`/admin/users/${userId}`);
};

export const getAllTutorsWithSubjects = async () => {
  return api.get('/admin/tutors');
};

export const approveUser = async (userId: string) => {
  return api.put(`/admin/users/${userId}/approve`);
};

export const inviteUser = async (data: {
  name: string;
  email: string;
  role: 'student' | 'tutor';
  temporaryPassword: string;
  phone?: string;
  subjects?: string[];
  experience?: string;
}) => {
  return api.post('/admin/users/invite', data);
};

// Subject APIs
export const getSubjects = async (params?: any) => {
  return api.get('/subjects', { params });
};

export const getSubjectById = async (id: string) => {
  return api.get(`/subjects/${id}`);
};

export const createSubject = async (data: {
  name: string;
  description?: string;
  category?: string;
}) => {
  return api.post('/subjects', data);
};

export const updateSubject = async (id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}) => {
  return api.put(`/subjects/${id}`, data);
};

export const deleteSubject = async (id: string) => {
  return api.delete(`/subjects/${id}`);
};

export const toggleSubjectStatus = async (id: string) => {
  return api.put(`/subjects/${id}/toggle`);
};


// Get availability for a specific tutor
export const getTutorAvailability = async (tutorId: string) => {
  return api.get(`/tutors/${tutorId}/availability`);
};

// Update availability for a specific tutor
export const updateTutorAvailability = async (
  tutorId: string,
  updatedAvailability: {
    [day: string]: { start: string; end: string };
  }
) => {
  return api.put(`/tutors/${tutorId}/availability`, updatedAvailability);
};

// Delete availability for a specific day
export const deleteTutorAvailability = async (tutorId: string, day: string) => {
  return api.delete(`/tutors/${tutorId}/availability/${day}`);
};


export const createMeetingLink = async (data: {
  startTime: string;
  endTime: string;
  tutorName: string;
}) => {
  const { startTime, endTime, tutorName } = data;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const selectedDate = startTime.split("T")[0];
  const selectedTime = new Date(startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const localDateTimeString = new Date(startTime).toLocaleString();

  const payload = {
    summary: `1-on-1 Session with ${tutorName}`,
    startTime,
    endTime,
    timeZone,
    selectedDate,
    selectedTime,
    localDateTimeString,
  };

  try {
    const res = await api.post('/create-meeting', payload);
    return res.data.meetLink;
  } catch (error) {
    console.error('Error creating meeting link:', error);
    throw error;
  }
};

export const sendBulkInvitations = async (data: { students: { name: string; email: string; }[], slots: any[] }) => {
  return api.post('/email/bulk-invite', data);
};

export const updateUserAccessibility = async (userId: string, settings: {
  canBookOneOnOne: boolean;
  canRequestSlots: boolean;
}) => {
  return api.put(`/admin/users/${userId}/accessibility`, settings);
};

export const restrictStudentAccess = async (userId: string, accessTill: string) => {
  return api.put(`/admin/users/${userId}/restrict-access`, { accessTill });
};

export const enableStudentAccess = async (userId: string) => {
  return api.put(`/admin/users/${userId}/enable-access`);
};

// Smart Quad Batch APIs
export const getSmartQuadBatches = async (params: any = {}) => {
  return api.get('/smart-quad-batches', { params });
};

export const getSmartQuadBatchById = async (id: string) => {
  return api.get(`/smart-quad-batches/${id}`);
};

export const createSmartQuadBatch = async (data: any) => {
  return api.post('/smart-quad-batches', data);
};

export const updateSmartQuadBatch = async (id: string, data: any) => {
  return api.put(`/smart-quad-batches/${id}`, data);
};

export const deleteSmartQuadBatch = async (id: string) => {
  return api.delete(`/smart-quad-batches/${id}`);
};

export const archiveSmartQuadBatch = async (id: string) => {
  return api.put(`/smart-quad-batches/${id}/archive`);
};

export const activateSmartQuadBatch = async (id: string) => {
  return api.put(`/smart-quad-batches/${id}/activate`);
};

export const permanentlyDeleteSmartQuadBatch = async (id: string) => {
  return api.delete(`/smart-quad-batches/${id}/permanent`);
};

// Smart Quad Slot APIs
export const createSmartQuadSlot = async (batchId: string, data: any) => {
  return api.post(`/smart-quad-batches/${batchId}/slots`, data);
};

export const getSmartQuadSlots = async (batchId: string, params: any = {}) => {
  return api.get(`/smart-quad-batches/${batchId}/slots`, { params });
};

export const getAvailableSlots = async (batchId: string, params: any = {}) => {
  return api.get(`/smart-quad-batches/${batchId}/slots/available`, { params });
};

export const updateSmartQuadSlot = async (batchId: string, slotId: string, data: any) => {
  return api.put(`/smart-quad-batches/${batchId}/slots/${slotId}`, data);
};

export const deleteSmartQuadSlot = async (batchId: string, slotId: string, force: boolean = false) => {
  return api.delete(`/smart-quad-batches/${batchId}/slots/${slotId}?force=${force}`);
};

// Student Enrollment APIs
export const enrollStudent = async (batchId: string, data: any) => {
  return api.post(`/smart-quad-batches/${batchId}/enrollments`, data);
};

export const getBatchEnrollments = async (batchId: string, params: any = {}) => {
  return api.get(`/smart-quad-batches/${batchId}/enrollments`, { params });
};

export const updateEnrollment = async (batchId: string, enrollmentId: string, data: any) => {
  return api.put(`/smart-quad-batches/${batchId}/enrollments/${enrollmentId}`, data);
};

export const extendEnrollment = async (batchId: string, enrollmentId: string, data: any) => {
  return api.put(`/smart-quad-batches/${batchId}/enrollments/${enrollmentId}/extend`, data);
};

export const cancelEnrollment = async (batchId: string, enrollmentId: string, data: any) => {
  return api.put(`/smart-quad-batches/${batchId}/enrollments/${enrollmentId}/cancel`, data);
};

export const getMyEnrollments = async () => {
  return api.get('/session-bookings/my-enrollments');
};

// Notification APIs
export const sendCourseExpiryNotifications = async () => {
  return api.post('/notifications/course-expiry');
};

export const sendSmartQuadAvailabilityNotifications = async (smartQuadId: string) => {
  return api.post('/notifications/smart-quad-availability', { smartQuadId });
};

export const sendSessionCancellationNotifications = async (sessionId: string, cancellationReason: string) => {
  return api.post('/notifications/session-cancellation', { sessionId, cancellationReason });
};

export const getNotificationStats = async () => {
  return api.get('/notifications/stats');
};

// Session Booking APIs
export const bookSession = async (data: any) => {
  return api.post('/session-bookings', data);
};

export const getMyBookings = async (params: any = {}) => {
  return api.get('/session-bookings/my-bookings', { params });
};

export const cancelBooking = async (bookingId: string, data: any) => {
  return api.put(`/session-bookings/${bookingId}/cancel`, data);
};

export const completeSession = async (bookingId: string, data: any) => {
  return api.put(`/session-bookings/${bookingId}/complete`, data);
};

export const getSlotBookings = async (slotId: string, params: any = {}) => {
  return api.get(`/session-bookings/slots/${slotId}/bookings`, { params });
};

export const getEnrollmentBookings = async (enrollmentId: string, params: any = {}) => {
  return api.get(`/session-bookings/enrollment/${enrollmentId}`, { params });
};

export const getBatchBookings = async (batchId: string, params: any = {}) => {
  return api.get(`/session-bookings/batch/${batchId}`, { params });
};

export default api;
