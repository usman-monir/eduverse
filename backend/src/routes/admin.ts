import express from 'express';
import {
  getSystemStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminSessions,
  getAdminMaterials,
  getAllTutorsWithSubjects,
  approveUser,
  inviteUser,
  updateUserAccess,
  enableUserAccess,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { authorizeTutorOrAdmin } from '../middleware/auth';

const router = express.Router();

// Public route to get all tutors with subjects
router.get('/tutors', getAllTutorsWithSubjects);

// Admin only routes
router.use(authenticate, authorize('admin'));

// System stats
router.get('/stats', getSystemStats);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/approve', approveUser);
router.post('/users/invite', inviteUser);

// Update user accessibility settings
router.put('/users/:userId/accessibility', authenticate, authorizeTutorOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { canBookOneOnOne, canRequestSlots } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update accessibility settings
    user.canBookOneOnOne = canBookOneOnOne;
    user.canRequestSlots = canRequestSlots;

    await user.save();

    return res.json({
      success: true,
      data: user,
      message: 'User accessibility settings updated successfully'
    });
  } catch (error) {
    console.error('Update user accessibility error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user accessibility'
    });
  }
});

// Restrict student access
router.put('/users/:userId/restrict', authenticate, authorizeTutorOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { restrictDate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Can only restrict student access'
      });
    }

    user.accessTill = new Date(restrictDate);
    await user.save();

    return res.json({
      success: true,
      data: user,
      message: 'Student access restricted successfully'
    });
  } catch (error) {
    console.error('Restrict student access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while restricting student access'
    });
  }
});

// Enable student access
router.put('/users/:userId/enable-access', authenticate, authorizeTutorOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Can only enable student access'
      });
    }

    user.accessTill = null;
    await user.save();

    return res.json({
      success: true,
      data: user,
      message: 'Student access enabled successfully'
    });
  } catch (error) {
    console.error('Enable student access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while enabling student access'
    });
  }
});

// Session management
router.get('/sessions', getAdminSessions);

// Material management
router.get('/materials', getAdminMaterials);

export default router;
