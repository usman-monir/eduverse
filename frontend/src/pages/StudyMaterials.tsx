import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  Eye,
  Shield,
  Loader2,
  Folder,
  FolderOpen,
  Upload,
  ArrowLeft,
  File,
} from "lucide-react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStudyMaterials,
  getStudyMaterialCollections,
  uploadStudyMaterial,
  deleteStudyMaterial,
} from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

function CreateCollectionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [collectionName, setCollectionName] = React.useState("");
  const [collectionDescription, setCollectionDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!collectionName.trim()) {
      setError("Please enter a collection name.");
      return;
    }
    
    setLoading(true);
    try {
      // Create a collection info file
      const formData = new FormData();
      formData.append("title", `${collectionName.trim()} - Collection Info`);
      formData.append(
        "description",
        collectionDescription.trim() ||
          `This collection contains study materials for ${collectionName.trim()}. Upload your files here to organize your learning resources.`
      );
      formData.append("subject", "Collection Management");
      formData.append("collectionName", collectionName.trim());

      // Create a collection info PDF file
      const userDescription = collectionDescription.trim()
        ? `\n\nDescription:\n${collectionDescription.trim()}`
        : "";
      const collectionInfo = `Collection: ${collectionName.trim()}

This is a collection folder for organizing study materials.${userDescription}

              Created on: ${new Date().toLocaleDateString()}

              Instructions:
              - Click "Upload to ${collectionName.trim()}" to add files
              - Use the search bar to find specific materials
              - Click "View" to preview files
              - Files are protected from download and screenshots

              Happy studying! 📚`;

      // Create a minimal valid PDF structure
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Collection: ${collectionName.trim()}) Tj
0 -20 Td
(This is a collection folder for organizing study materials.) Tj
0 -20 Td
(Created on: ${new Date().toLocaleDateString()}) Tj
0 -20 Td
(Instructions:) Tj
0 -15 Td
(- Click "Upload to ${collectionName.trim()}" to add files) Tj
0 -15 Td
(- Use the search bar to find specific materials) Tj
0 -15 Td
(- Click "View" to preview files) Tj
0 -15 Td
(- Files are protected from download and screenshots) Tj
0 -20 Td
(Happy studying! 📚) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000200 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
350
%%EOF`;

      const dummyBlob = new Blob([pdfContent], { type: "application/pdf" });
      const dummyFile = Object.assign(dummyBlob, {
        name: `${collectionName.trim()}-collection-info.pdf`,
        lastModified: Date.now(),
      }) as File;
      formData.append("file", dummyFile);

      await uploadStudyMaterial(formData);

      // Reset form and close dialog
      setCollectionName("");
      setCollectionDescription("");
      setError(null);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creating collection:', err);
      setError(err.response?.data?.message || "Failed to create collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Collection</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your study materials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Collection Name *</Label>
            <Input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Enter collection name"
              required
              maxLength={50}
            />
          </div>
          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={collectionDescription}
              onChange={(e) => setCollectionDescription(e.target.value)}
              placeholder="Describe what this collection is for..."
              maxLength={200}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="px-4 py-2 rounded bg-gray-200">
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Collection"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudyMaterialUploadDialog({
  open,
  onClose,
  onUploaded,
  collectionName,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  collectionName: string;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!title.trim() || !file) {
      setError("Please fill all required fields.");
      return;
    }
    
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("subject", subject.trim());
      formData.append("file", file);
      formData.append("collectionName", collectionName);

      const response = await uploadStudyMaterial(formData);
      
      if (response.status === 201) {
        // Reset form and close dialog
        setTitle("");
        setDescription("");
        setSubject("");
        setFile(null);
        setError(null);
        
        // Close dialog first
        onClose();
        
        // Then refresh data to get the new material
        setTimeout(() => {
          onUploaded();
        }, 100);
      }
    } catch (err: any) {
      console.error('Error uploading material:', err);
      setError(err.response?.data?.message || "Failed to upload material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload to {collectionName}</DialogTitle>
          <DialogDescription>
            Upload a new study material file to this collection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <Label>File *</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.webm,.ogg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="px-4 py-2 rounded bg-gray-200">
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudyMaterialViewer({
  open,
  onClose,
  material,
  user,
}: {
  open: boolean;
  onClose: () => void;
  material: any;
  user: any;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = React.useState<number>(0);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = React.useState(1000);

  // Handle window resize for PDF scaling
  React.useEffect(() => {
    const updatePdfWidth = () => {
      const newWidth = Math.max(800, Math.min(1200, window.innerWidth - 80));
      setPdfWidth(newWidth);
    };

    updatePdfWidth();
    window.addEventListener('resize', updatePdfWidth);
    
    return () => {
      window.removeEventListener('resize', updatePdfWidth);
    };
  }, []);

  // Watermark text: viewer email + uploader name/email
  const watermarkText = `Viewer: ${user?.email || ""} \nUploaded by: ${
    material.uploadedBy?.name ||
    material.uploadedByName ||
    material.uploadedBy?.email ||
    ""
  }`;

  // Prevent right-click, print, and selection
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (viewerRef.current && viewerRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P (print), Ctrl+S (save), Ctrl+C (copy)
      if (
        (e.ctrlKey || e.metaKey) &&
        ["p", "s", "c"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Fetch PDF with Authorization header if needed
  React.useEffect(() => {
    const fetchPdf = async () => {
      if (material.fileType === "pdf") {
        setPdfLoading(true);
        setPdfError(null);
        
        try {
          // For PDFs, use the Cloudinary URL directly since backend redirects there
          let pdfUrl: string;
          
          if (material.fileUrl && material.fileUrl.includes('cloudinary.com')) {
            // Use Cloudinary URL directly for better performance
            pdfUrl = material.fileUrl;
            console.log('📄 Using Cloudinary URL directly:', pdfUrl);
          } else {
            // Fallback to API endpoint
            pdfUrl = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`;
            console.log('📄 Using API endpoint:', pdfUrl);
          }
          
          const response = await fetch(pdfUrl, {
            method: 'GET',
            // Don't include Authorization for Cloudinary URLs
            ...(pdfUrl.includes('cloudinary.com') ? {} : {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
          }
          
          // Get the binary data as blob
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
          console.log('✅ PDF loaded successfully from:', pdfUrl);
        } catch (err) {
          console.error('Failed to fetch PDF:', err);
          setPdfError(err instanceof Error ? err.message : 'Failed to load PDF');
          setPdfBlobUrl(null);
        } finally {
          setPdfLoading(false);
        }
      }
    };
    
    if (open) {
      fetchPdf();
    }
    
    // Cleanup blob URL on close/unmount
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [material, open]);

  console.log("Viewing material:", material);

  if (!material || (!material.id && !material._id)) return null;
  
  // Generate proper file URLs based on file type
  const getFileUrl = (materialId: string, fileType: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (fileType === 'pdf') {
      return `${baseUrl}/study-materials/${materialId}/file`;
    } else if (['jpg', 'jpeg', 'png'].includes(fileType)) {
      return `${baseUrl}/study-materials/${materialId}/thumbnail`;
    } else if (['mp4', 'webm', 'ogg'].includes(fileType)) {
      return `${baseUrl}/study-materials/${materialId}/file`;
    } else {
      return `${baseUrl}/study-materials/${materialId}/file`;
    }
  };

  const fileUrl = getFileUrl(material.id || material._id, material.fileType);

  console.log("File URL:", fileUrl);

  const isPDF = material.fileType === "pdf";
  const isImage = ["jpg", "jpeg", "png"].includes(material.fileType);
  const isVideo = ["mp4", "webm", "ogg"].includes(material.fileType);
  const isDocument = ["doc", "docx", "ppt", "pptx"].includes(material.fileType);

  console.log("File type detected:", material.fileType);
  console.log("Is PDF:", isPDF);
  console.log("Is Image:", isImage);
  console.log("Is Video:", isVideo);
  console.log("Is Document:", isDocument);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh]">
        <DialogHeader>
          <DialogTitle>{material.title}</DialogTitle>
          <DialogDescription>
            Protected viewing. Download/print/copy is disabled.
          </DialogDescription>
          {/* PDF Controls */}
          {material.fileType === 'pdf' && (
            <div className="flex items-center space-x-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPdfWidth(Math.max(600, pdfWidth - 100))}
                disabled={pdfWidth <= 600}
              >
                Zoom Out
              </Button>
              <span className="text-sm text-gray-600">
                {Math.round((pdfWidth / 800) * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPdfWidth(Math.min(1600, pdfWidth + 100))}
                disabled={pdfWidth >= 1600}
              >
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPdfWidth(Math.max(800, Math.min(1200, window.innerWidth - 80)))}
              >
                Reset
              </Button>
            </div>
          )}
        </DialogHeader>
        <div
          ref={viewerRef}
          className="relative bg-gray-100 rounded shadow overflow-auto flex-1 flex flex-col items-center justify-start select-none"
          style={{ userSelect: "none" }}
        >
          {/* Dynamic Watermark overlay */}
          <div
            className="pointer-events-none select-none fixed top-4 left-1/2 -translate-x-1/2 opacity-40 text-2xl font-bold text-gray-700"
            style={{
              zIndex: 9999,
              animation: "watermark-move 4s linear infinite alternate",
              whiteSpace: "pre",
              transform: "translateX(0%) rotate(-20deg)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {watermarkText}
          </div>
          {/* File rendering */}
          {isPDF && (
            <div
              className="w-full flex flex-col items-center"
              style={{ zIndex: 1 }}
            >
              {pdfLoading && (
                <div className="p-8 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading PDF...
                </div>
              )}
              
              {pdfError && (
                <div className="p-8 text-center text-red-500">
                  <p className="mb-2">
                    {material.title && material.title.includes('Collection Info') 
                      ? 'Collection Folder' 
                      : 'Failed to load PDF'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mb-3">{pdfError}</p>
                  
                  {material.title && material.title.includes('Collection Info') ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <p className="text-blue-800 text-sm">
                        💡 <strong>Tip:</strong> This is a collection folder. To view study materials:
                      </p>
                      <ul className="text-blue-700 text-sm mt-2 text-left list-disc list-inside">
                        <li>Upload actual study material files to this collection</li>
                        <li>Click on the uploaded files to view them</li>
                        <li>Collection folders are just for organization</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPdfError(null);
                          // Retry loading
                          const fetchPdf = async () => {
                            setPdfLoading(true);
                            try {
                              const fileUrl = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`;
                              const token = localStorage.getItem("token");
                              const response = await fetch(fileUrl, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              setPdfBlobUrl(url);
                              setPdfError(null);
                            } catch (err) {
                              setPdfError(err instanceof Error ? err.message : 'Failed to load PDF');
                            } finally {
                              setPdfLoading(false);
                            }
                          };
                          fetchPdf();
                        }}
                      >
                        Retry
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            // Try to download the PDF as fallback
                            const fileUrl = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`;
                            const token = localStorage.getItem("token");
                            const response = await fetch(fileUrl, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!response.ok) throw new Error(`Failed to download PDF: ${response.status}`);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = material.fileName || 'document.pdf';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Download failed:', err);
                          }
                        }}
                      >
                        Download Instead
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {!pdfLoading && !pdfError && pdfBlobUrl && (
                <div className="w-full max-w-none overflow-x-auto px-4">
                  <Document
                    file={pdfBlobUrl}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={
                      <div className="p-8 text-center text-gray-500">
                        Processing PDF...
                      </div>
                    }
                    error={
                      <div className="p-8 text-center text-red-500">
                        Error loading PDF content
                      </div>
                    }
                    onLoadError={(err) => {
                      console.error("PDF load error:", err);
                      // Check if it's a collection info file (dummy PDF)
                      if (material.title && material.title.includes('Collection Info')) {
                        setPdfError('This is a collection folder, not a study material. Please upload actual files to view them.');
                      } else {
                        setPdfError('Failed to process PDF content. The file may be corrupted or invalid.');
                      }
                    }}
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <div key={`page_${index + 1}`} className="mb-6 flex justify-center min-w-max">
                        <Page
                          pageNumber={index + 1}
                          width={pdfWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="shadow-lg"
                          scale={1.0}
                        />
                      </div>
                    ))}
                  </Document>
                </div>
              )}
            </div>
          )}
          {isImage && (
            <div className="w-full flex justify-center overflow-x-auto">
              <img
                src={`${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`}
                alt={material.title}
                className="max-h-[70vh] max-w-full object-contain"
                style={{ zIndex: 1 }}
                draggable={false}
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Image loading failed from file endpoint, trying thumbnail:', e);
                  console.log('Material details:', material);
                  console.log('Image URL:', `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`);
                  
                  // Try thumbnail endpoint as fallback
                  const target = e.target as HTMLImageElement;
                  target.src = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/thumbnail`;
                  
                  // If thumbnail also fails, try original Cloudinary URL
                  target.onerror = () => {
                    console.log('Thumbnail also failed, trying original Cloudinary URL:', material.fileUrl);
                    target.src = material.fileUrl;
                  };
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully from file endpoint');
                }}
              />
            </div>
          )}
          {isVideo && (
            <div className="w-full flex justify-center overflow-x-auto">
              <video
                src={`${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`}
                controls
                className="max-h-[70vh] max-w-full object-contain"
                style={{ zIndex: 1 }}
                onError={(e) => {
                  console.error('Video loading failed:', e);
                }}
              />
            </div>
          )}
          {!isPDF && !isImage && !isVideo && (
            <div className="p-8 text-center text-gray-500">
              <div className="mb-4">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {isDocument ? 'Document File' : 'Unsupported File Type'}
                </p>
                <p className="text-sm mb-4">
                  {isDocument 
                    ? `This file type (${material.fileType?.toUpperCase()}) cannot be previewed directly.`
                    : `This file type (${material.fileType?.toUpperCase()}) is not supported for preview.`
                  }
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {isDocument 
                    ? 'You can download the file to view it in your preferred application.'
                    : 'Please download the file to access its content.'
                  }
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`;
                      const token = localStorage.getItem("token");
                      
                      console.log('🔍 Download attempt details:');
                      console.log('📁 File URL:', fileUrl);
                      console.log('🔑 Token exists:', !!token);
                      console.log('🔑 Token preview:', token ? token.substring(0, 30) + '...' : 'No token');
                      
                      if (!token) {
                        console.error('No authentication token found');
                        alert('Please log in to download this file');
                        return;
                      }
                      
                      // Validate token format
                      if (!token.startsWith('eyJ') || token.length < 50) {
                        console.error('Invalid token format:', token);
                        alert('Authentication token is invalid. Please log in again.');
                        return;
                      }
                      
                      console.log('🔐 Downloading with token:', token.substring(0, 20) + '...');
                      
                      const response = await fetch(fileUrl, {
                        headers: { 
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/octet-stream'
                        },
                      });
                      
                      console.log('📡 Response status:', response.status);
                      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Download failed:', response.status, errorText);
                        throw new Error(`Failed to download: ${response.status} - ${errorText}`);
                      }
                      
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = material.fileName || `document.${material.fileType}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      console.log('✅ Download completed successfully');
                    } catch (err) {
                      console.error('Download failed:', err);
                      // Show user-friendly error
                      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {material.fileType?.toUpperCase()}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token");
                      
                      if (!token) {
                        alert('Please log in to access this file');
                        return;
                      }
                      
                      // For authenticated files, we need to create a temporary download link
                      // since we can't directly open authenticated URLs in new tabs
                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL}/study-materials/${material.id || material._id}/file`;
                      
                      console.log('🔐 Opening file in new tab with authentication');
                      
                      // Create a temporary download to open in new tab
                      const response = await fetch(fileUrl, {
                        headers: { 
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to open file: ${response.status} - ${errorText}`);
                      }
                      
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      
                      // Open in new tab
                      const newWindow = window.open(url, '_blank');
                      if (!newWindow) {
                        alert('Please allow popups to open this file in a new tab');
                      }
                      
                      // Clean up the blob URL after a delay
                      setTimeout(() => URL.revokeObjectURL(url), 60000); // 1 minute
                      
                    } catch (err) {
                      console.error('Failed to open file:', err);
                      alert(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> {isDocument ? 'For the best viewing experience:' : 'To access this file:'}
                </p>
                <ul className="text-blue-700 text-sm mt-2 text-left list-disc list-inside">
                  {isDocument ? (
                    <>
                      <li>Download the file to view it in your preferred application</li>
                      <li>Use Microsoft Office, Google Docs, or LibreOffice for document files</li>
                      <li>Some browsers can open files directly in new tabs</li>
                    </>
                  ) : (
                    <>
                      <li>Download the file to access its content</li>
                      <li>Use appropriate software to open the file</li>
                      <li>Contact support if you need help with this file type</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Downloading, printing, copying, and screenshots are discouraged.
          Content is protected.
        </div>
        <style>{`
          @keyframes watermark-move {
            0% { top: 10%; left: 5%; }
            100% { top: 60%; left: 40%; }
          }
          
          /* Ensure PDF pages don't get squeezed */
          .react-pdf__Page {
            margin: 0 auto !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
          }
          
          .react-pdf__Page__canvas {
            display: block !important;
            margin: 0 auto !important;
            max-width: none !important;
            height: auto !important;
          }
          
          /* Prevent text selection and ensure proper scaling */
          .react-pdf__Page__textContent {
            display: none !important;
          }
          
          .react-pdf__Page__annotations {
            display: none !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

const StudyMaterials = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [collections, setCollections] = useState<string[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(
    null
  );
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<any | null>(null);

  // Group materials by collection
  const materialsByCollection = materials.reduce((acc, material) => {
    const collection = material.collectionName || "Uncategorized";
    if (!acc[collection]) {
      acc[collection] = [];
    }
    acc[collection].push(material);
    return acc;
  }, {} as Record<string, any[]>);

  React.useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await getStudyMaterialCollections();
        setCollections(res.data.data || []);
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Failed to fetch collections');
      }
    };
    fetchCollections();
  }, []);

  React.useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      setError(null);
      
      // Clear existing materials first to prevent stale data
      setMaterials([]);
      
      try {
        const params: any = {};
        if (currentCollection) params.collectionName = currentCollection;
        const materialsRes = await getStudyMaterials(params);
        
        // Ensure we get fresh data and clear any cached/stale data
        const freshMaterials = materialsRes.data.data || [];
        setMaterials(freshMaterials);
        
      } catch (err: any) {
        console.error('Error fetching materials:', err);
        setError(
          err.response?.data?.message || "Failed to fetch study materials"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [currentCollection]);

  const filteredMaterials = materials.filter((material) => {
    return (
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getFileTypeIcon = (fileType: string, title?: string) => {
    // Check if it's a collection info file
    if (title && title.includes('Collection Info')) {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "ppt":
      case "pptx":
        return <FileText className="h-4 w-4 text-orange-500" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "mp4":
      case "webm":
      case "ogg":
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleDelete = async (material: any) => {
    if (!window.confirm("Are you sure you want to delete this material?"))
      return;
    
    try {
      await deleteStudyMaterial(material._id || material.id);
      // Refresh data after successful deletion
      await refreshData();
    } catch (err: any) {
      console.error('Error deleting material:', err);
      setError(err.response?.data?.message || "Failed to delete material");
    }
  };

  const refreshData = async () => {
    try {
      // Fetch collections
      const collectionsRes = await getStudyMaterialCollections();
      setCollections(collectionsRes.data.data || []);
      
      // Fetch materials
      setLoading(true);
      setError(null);
      const params: any = {};
      if (currentCollection) params.collectionName = currentCollection;
      const materialsRes = await getStudyMaterials(params);
      
      // Ensure we get fresh data and clear any cached/stale data
      const freshMaterials = materialsRes.data.data || [];
      setMaterials(freshMaterials);
      
      // Force re-render by updating state
      setMaterials([...freshMaterials]);
      
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.response?.data?.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading study materials...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-500">Error loading study materials: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {currentCollection && (
              <Button
                variant="outline"
                onClick={() => setCurrentCollection(null)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Collections
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {currentCollection ? currentCollection : "Study Materials"}
              </h1>
              <p className="text-gray-600">
                {currentCollection
                  ? `Files in ${currentCollection}`
                  : "Browse your learning resources by collection"}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {!currentCollection &&
              (user?.role === "admin" || user?.role === "tutor") && (
                <Button
                  onClick={() => setShowCreateCollection(true)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Folder className="h-4 w-4" />
                  Create Collection
                </Button>
              )}
            {currentCollection &&
              (user?.role === "admin" || user?.role === "tutor") && (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload to {currentCollection}
                </Button>
              )}
          </div>
        </div>

        {/* Search */}
        {currentCollection && (
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search files in this collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Collections View */}
        {!currentCollection && (
          <>
            {/* Collections Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{collections.length}</div>
                  <p className="text-sm text-gray-600">Collections</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {materials.length}
                  </div>
                  <p className="text-sm text-gray-600">Total Files</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    Protected
                  </div>
                  <p className="text-sm text-gray-600">View Only</p>
                </CardContent>
              </Card>
            </div>

            {/* Collections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection) => {
                const collectionMaterials =
                  materialsByCollection[collection] || [];
                const fileCount = collectionMaterials.length;
                const subjects = [
                  ...new Set(collectionMaterials.map((m) => m.subject)),
                ];

                return (
                  <Card
                    key={collection}
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setCurrentCollection(collection)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Folder className="h-8 w-8 text-blue-500 group-hover:text-blue-600" />
                        <Badge variant="outline">{fileCount} files</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-lg mb-2">
                        {collection}
                      </CardTitle>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📁 {fileCount} materials</p>
                        {subjects.length > 0 && (
                          <p>
                            📚 {subjects.slice(0, 2).join(", ")}
                            {subjects.length > 2 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Files View */}
        {currentCollection && (
          <>
            {/* Files Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {filteredMaterials.length}
                  </div>
                  <p className="text-sm text-gray-600">Files</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      [...new Set(filteredMaterials.map((m) => m.subject))]
                        .length
                    }
                  </div>
                  <p className="text-sm text-gray-600">Subjects</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      filteredMaterials.filter((m) => m.fileType === "pdf")
                        .length
                    }
                  </div>
                  <p className="text-sm text-gray-600">PDF Files</p>
                </CardContent>
              </Card>
            </div>

            {/* Files Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Refreshing materials...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((material) => (
                  <Card
                    key={material.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getFileTypeIcon(material.fileType, material.title)}
                          <Badge variant="outline">
                            {material.fileType?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{material.title}</CardTitle>
                      <CardDescription>{material.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>📚 Subject: {material.subject}</p>
                        <p>
                          👨‍🏫 Uploaded by:{" "}
                          {material.uploadedBy?.name ||
                            material.uploadedByName ||
                            "-"}
                        </p>
                        <p>📅 Date: {material.uploadedAt}</p>
                        <p>📁 File: {material.fileName}</p>
                        
                        {/* Show collection info indicator */}
                        {material.title && material.title.includes('Collection Info') && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-blue-700 text-xs">
                              📁 <strong>Collection Folder</strong> - This is an organizational folder, not a study material
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button
                          className="flex-1"
                          onClick={() => setViewMaterial(material)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {(user?.role === "admin" ||
                          (user?.role === "tutor" &&
                            (material.uploadedBy?._id === user.id ||
                              material.uploadedBy === user.id))) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(material)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        Content is protected from download and screenshots
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && filteredMaterials.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No files found in this collection
                </p>
                {searchTerm && (
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Create Collection Dialog */}
        {showCreateCollection && (
          <CreateCollectionDialog
            open={showCreateCollection}
            onClose={() => setShowCreateCollection(false)}
            onCreated={refreshData}
          />
        )}

        {/* Upload Dialog */}
        {showUpload && (
          <StudyMaterialUploadDialog
            open={showUpload}
            onClose={() => setShowUpload(false)}
            onUploaded={refreshData}
            collectionName={currentCollection || ""}
          />
        )}

        {/* Viewer Dialog */}
        {viewMaterial && (
          <StudyMaterialViewer
            open={!!viewMaterial}
            onClose={() => setViewMaterial(null)}
            material={viewMaterial}
            user={user}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudyMaterials;
