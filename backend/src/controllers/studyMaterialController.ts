import { Request, Response } from 'express';
import { StudyMaterial, IStudyMaterial } from '../models/StudyMaterial';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get study material file (with access control)
// @route   GET /api/study-materials/:id/file
// @access  Private (authenticated users)
export const getStudyMaterialFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'You do not have permission to access this material' });
      return;
    }

    // For images, redirect to Cloudinary URL with transformation
    if (['jpg', 'jpeg', 'png'].includes(material.fileType)) {
      const optimizedUrl = material.fileUrl.replace('/upload/', '/upload/q_auto,f_auto/');
      res.redirect(optimizedUrl);
      return;
    }

    // For other files, redirect to Cloudinary URL
    res.redirect(material.fileUrl);

  } catch (error: any) {
    console.error('❌ Error serving file:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file',
    });
  }
};


// @desc    Get study material thumbnail/preview
// @route   GET /api/study-materials/:id/thumbnail
// @access  Private  
export const getStudyMaterialThumbnail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // For images, redirect to Cloudinary URL with thumbnail transformation
    if (['jpg', 'jpeg', 'png'].includes(material.fileType)) {
      const thumbnailUrl = material.fileUrl.replace('/upload/', '/upload/w_300,h_400,c_fill,q_auto/');
      res.redirect(thumbnailUrl);
      return;
    }

    // For PDFs, redirect to first page as image
    if (material.fileType === 'pdf') {
      const thumbnailUrl = material.fileUrl.replace('/upload/', '/upload/w_300,h_400,c_fill,q_auto,pg_1/');
      res.redirect(thumbnailUrl);
      return;
    }

    // For videos, redirect to video thumbnail
    if (['mp4', 'ogg', 'webm'].includes(material.fileType)) {
      const thumbnailUrl = material.fileUrl.replace('/upload/', '/upload/w_300,h_400,c_fill,q_auto/');
      res.redirect(thumbnailUrl);
      return;
    }

    // For other file types, return a placeholder or error
    res.status(404).json({
      success: false,
      message: 'Thumbnail not available for this file type',
    });

  } catch (error: any) {
    console.error('❌ Error serving thumbnail:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch thumbnail',
    });
  }
};

// @desc    Get all study materials (with filters)
// @route   GET /api/study-materials
// @access  Private (authenticated users only)
export const getStudyMaterials = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // ✅ Authentication check
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access study materials',
      });
      return;
    }

    // ✅ Role validation
    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Invalid user role.',
      });
      return;
    }

    // ✅ Account status check
    if (req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is not active yet. Please contact administrator.',
      });
      return;
    }

    // ✅ Extract query params
    const {
      subject,
      uploadedBy,
      accessLevel,
      page = 1,
      limit = 10,
      collectionName,
    } = req.query;

    const filter: Record<string, any> = {};

    // ✅ Apply search filters
    if (subject) {
      filter.subject = { $regex: subject as string, $options: 'i' };
    }
    if (uploadedBy) {
      filter.uploadedByName = { $regex: uploadedBy as string, $options: 'i' };
    }
    if (accessLevel) {
      filter.accessLevel = accessLevel;
    }
    if (collectionName) {
      filter.collectionName = { $regex: collectionName as string, $options: 'i' };
    }

    // ✅ Access-level based visibility logic
    const accessFilters: Record<string, any> = {
      $or: [{ accessLevel: 'all' }],
    };

    if (req.user.role === 'admin') {
      accessFilters.$or.push({ accessLevel: 'tutor' }, { accessLevel: 'admin' });
    } else if (req.user.role === 'tutor') {
      accessFilters.$or.push({ accessLevel: 'tutor' });
    }

    // ✅ Combine all filters
    const finalFilter =
      Object.keys(filter).length > 0
        ? { $and: [filter, accessFilters] }
        : accessFilters;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitParsed = parseInt(limit as string);

    // ✅ Fetch materials with pagination and sorting
    const materials = await StudyMaterial.find(finalFilter)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limitParsed);

    const total = await StudyMaterial.countDocuments(finalFilter);

    // ✅ Sanitize results
    const processedMaterials = materials.map((material) => {
      const materialObj = material.toObject();
      return {
        ...materialObj,
        id: material._id,
        hasFile: !!material.fileUrl,
      };
    });

    // ✅ Send response
    res.json({
      success: true,
      data: processedMaterials,
      pagination: {
        page: parseInt(page as string),
        limit: limitParsed,
        total,
        pages: Math.ceil(total / limitParsed),
      },
    });
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching study materials',
    });
  }
};




// @desc    Get study material by ID
// @route   GET /api/study-materials/:id
// @access  Private
export const getStudyMaterialById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check authentication
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Check user role and status
    if (!['student', 'tutor', 'admin'].includes(req.user.role) || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id).populate(
      'uploadedBy',
      'name email'
    );

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access level permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this material',
      });
      return;
    }

    // Increment view count
    material.viewCount += 1;
    await material.save();

    // Return material without direct fileUrl
    const safeMaterial = {
      ...material.toObject(),
      fileUrl: undefined, // Remove direct URL
      id: material._id,
      hasFile: !!material.fileUrl,
    };

    res.json({
      success: true,
      data: safeMaterial,
    });
  } catch (error) {
    console.error('Get study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching study material',
    });
  }
};
// @desc    Upload study material (Tutors & Admins only)
// @route   POST /api/study-materials
// @access  Private (Tutor, Admin)

export const uploadStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check authentication and role
    if (!req.user || !['tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only tutors and admins can upload study materials',
      });
      return;
    }

    if (req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is not active yet',
      });
      return;
    }

    const {
      title,
      description,
      subject,
      accessLevel = 'all',
      tags = [],
      collectionName,
    } = req.body;

    const file = req.file;

    if (!file || !file.path) {
      res.status(400).json({
        success: false,
        message: 'File upload failed or unsupported file format.',
      });
      return;
    }

    // Upload to Cloudinary in the collection folder
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: `study-materials/${collectionName}`,
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'raw',
        use_filename: true,
        unique_filename: false,
        type: 'authenticated',
      });
    } catch (uploadError) {
      console.error('❌ Cloudinary upload failed:', uploadError);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file to cloud storage',
      });
      return;
    }

    // Helper function to get file extension from MIME type
    const getFileExtension = (mimetype: string, originalname: string): string => {      
      // First try to get extension from filename
      const filenameExt = originalname.split('.').pop()?.toLowerCase();
      if (filenameExt && ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'mp4', 'ogg', 'webm'].includes(filenameExt)) {
        return filenameExt;
      }
      
      // Fallback to MIME type mapping
      const mimeToExt: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogg',
        'application/octet-stream': 'docx', // Fallback for DOCX files
      };
      
      const mappedExt = mimeToExt[mimetype] || 'pdf'; // Default to PDF if unknown
      return mappedExt;
    };

    const fileUrl = uploadResult.secure_url;

    const material = new StudyMaterial({
      title,
      description,
      fileName: file.originalname,
      fileUrl,
      publicId: uploadResult.public_id,
      fileType: getFileExtension(file.mimetype, file.originalname),
      fileSize: file.size,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      subject,
      accessLevel,
      tags: Array.isArray(tags) ? tags : [tags],
      collectionName,
    });

    await material.save();

    res.status(201).json({
      success: true,
      data: material,
      message: 'Study material uploaded successfully',
    });
  } catch (error) {
    console.error('Upload study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading study material',
    });
  }
};
// @desc    Update study material (Owner & Admins only)
// @route   PUT /api/study-materials/:id
// @access  Private (Owner, Admin)
export const updateStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, subject, accessLevel, tags, collectionName } = req.body;

    if (!req.user || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check if user can update this material
    const canUpdate =
      req.user.role === 'admin' ||
      material.uploadedBy.toString() === (req.user._id as mongoose.Types.ObjectId).toString();

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own materials or be an admin',
      });
      return;
    }

    // Update fields
    if (title) material.title = title;
    if (description) material.description = description;
    if (subject) material.subject = subject;
    if (accessLevel) material.accessLevel = accessLevel;
    if (tags) material.tags = Array.isArray(tags) ? tags : [tags];
    if (collectionName) material.collectionName = collectionName;

    await material.save();

    res.json({
      success: true,
      data: material,
      message: 'Study material updated successfully',
    });
  } catch (error) {
    console.error('Update study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating study material',
    });
  }
}


  ;// @desc    Delete study material (Owner & Admins only)
// @route   DELETE /api/study-materials/:id
// @access  Private (Owner, Admin)
export const deleteStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // ✅ Check authentication and status
    if (!req.user || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // ✅ Check permission to delete
    const isAdmin = req.user.role === 'admin';
    const isOwner = material.uploadedBy.toString() === (req.user._id as mongoose.Types.ObjectId | string).toString();

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own materials',
      });
      return;
    }

    // ✅ Delete from Cloudinary if fileUrl exists
    if (material.fileUrl) {
      try {
        const publicId = material.publicId; // Assuming publicId is stored in the material document

        // Determine resource type based on file type
        let resourceType = 'raw';
        if (['jpg', 'jpeg', 'png'].includes(material.fileType)) {
          resourceType = 'image';
        } else if (['mp4', 'ogg', 'webm'].includes(material.fileType)) {
          resourceType = 'video';
        }

        const result = await cloudinary.uploader.destroy(publicId, {
          type: 'authenticated',
          resource_type: resourceType,
        });

        if (result.result !== 'ok' && result.result !== 'not found') {
          throw new Error(`Unexpected Cloudinary response: ${result.result}`);
        }
      } catch (cloudinaryError) {
        console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryError);
      }
    }


    // ✅ Delete from database
    await StudyMaterial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Study material deleted successfully',
    });
  } catch (error) {
    console.error('Delete study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting study material',
    });
  }
};


// @desc    Download study material (with access control)
// @route   GET /api/study-materials/:id/download
// @access  Private
export const downloadStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access level permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this material',
      });
      return;
    }

    // Increment download count
    material.downloadCount += 1;
    await material.save();

    try {
      const publicId = material.publicId; // Assuming publicId is stored in the material document
      if (!publicId) {
        throw new Error('Invalid file URL format');
      }

      // Generate a longer-lived signed URL for download (15 minutes)
      const signedUrl = cloudinary.url(publicId, {
        type: 'authenticated',
        resource_type: 'raw',
        secure: true,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes
      });

      res.json({
        success: true,
        data: {
          signedUrl,
          fileName: material.fileName,
        },
        message: 'Signed download link generated',
      });
    } catch (error) {
      console.error('Error generating download URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate download URL',
      });
    }
  } catch (error) {
    console.error('Download study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing download',
    });
  }
};

// @desc    Get all unique collection names
// @route   GET /api/study-materials/collections
// @access  Private
export const getStudyMaterialCollections = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Require authentication for collections as well
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Filter collections based on user access level
    const accessFilter: any = {
      $or: [{ accessLevel: 'all' }]
    };

    if (req.user.role === 'admin') {
      accessFilter.$or.push({ accessLevel: 'tutor' }, { accessLevel: 'admin' });
    } else if (req.user.role === 'tutor') {
      accessFilter.$or.push({ accessLevel: 'tutor' });
    }

    const collections = await StudyMaterial.distinct('collectionName', accessFilter);

    res.json({
      success: true,
      data: collections.filter(Boolean), // Remove null/undefined values
    });
  } catch (error) {
    console.error('Get study material collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching collections',
    });
  }
};
