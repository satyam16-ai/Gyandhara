import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, ZoomIn, ZoomOut, RotateCw, Download, GripVertical } from 'lucide-react';

const PDFViewer = ({ 
  isOpen, 
  onClose, 
  isTeacher, 
  roomId, 
  socket,
  pdfUrl,
  onPdfUpload 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const pdfViewerRef = useRef(null);
  
  // Resize functionality
  const [width, setWidth] = useState(384); // Default 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Handle resize functionality
  const handleMouseDown = (e) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Negative because we're resizing from the left
    const newWidth = Math.min(Math.max(startWidth + deltaX, 320), window.innerWidth * 0.8); // Min 320px, Max 80% of screen
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, startX, startWidth]);

  // Handle PDF upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('PDF file size must be less than 50MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert file to base64 for transmission
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        
        // Emit PDF data to server for distribution to students
        if (socket && roomId) {
          socket.emit('teacher-upload-pdf', {
            roomId,
            fileName: file.name,
            fileData: base64Data,
            timestamp: new Date().toISOString()
          });
        }

        // Call parent callback with the PDF URL
        if (onPdfUpload) {
          onPdfUpload(base64Data, file.name);
        }

        setIsLoading(false);
        console.log('PDF uploaded and shared with students');
      };

      reader.onerror = () => {
        setError('Error reading PDF file');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('PDF upload error:', error);
      setError('Failed to upload PDF');
      setIsLoading(false);
    }

    // Reset file input
    event.target.value = '';
  };

  // Handle zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setScale(1.0);

  // Handle rotation
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  // Handle page navigation
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle download
  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'lecture-document.pdf';
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed right-0 top-0 h-full bg-white border-l border-gray-300 shadow-2xl z-50 flex"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`w-3 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors duration-200 group relative select-none ${
          isResizing ? 'bg-blue-500 shadow-lg' : ''
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize PDF viewer"
        style={{ cursor: isResizing ? 'col-resize' : 'col-resize' }}
      >
        {/* Resize grip indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-12 bg-gray-500 group-hover:bg-white rounded-full opacity-80 group-hover:opacity-100 transition-all duration-200 shadow-sm"></div>
        </div>
        
        {/* Visual feedback when resizing */}
        {isResizing && (
          <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 bg-black text-white text-xs px-3 py-1 rounded shadow-lg pointer-events-none z-50">
            {width}px
          </div>
        )}
      </div>

      {/* PDF Viewer Content */}
      <div className="flex-1 flex flex-col">
        {/* PDF Viewer Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold text-lg">PDF Viewer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Close PDF Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* PDF Controls */}
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        {/* Upload Section (Teachers Only) */}
        {isTeacher && (
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Uploading...' : 'Upload PDF'}</span>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* PDF Controls */}
        {pdfUrl && (
          <div className="space-y-2">
            {/* Page Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 text-sm"
              >
                Previous
              </button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 text-sm"
              >
                Next
              </button>
            </div>

            {/* Zoom and Rotation Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={zoomOut}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <button
                  onClick={resetZoom}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                  title="Reset Zoom"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  onClick={zoomIn}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={rotate}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={downloadPdf}
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-2">
        {pdfUrl ? (
          <div 
            ref={pdfViewerRef}
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {/* PDF Embed - Responsive iframe approach */}
            <iframe
              src={`${pdfUrl}#page=${currentPage}&zoom=fit&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full border border-gray-300 rounded"
              style={{ 
                height: `${scale * 100}vh`,
                minHeight: '500px'
              }}
              title="PDF Document"
              onLoad={() => {
                // Try to get total pages (this is limited with iframe approach)
                setTotalPages(10); // Default fallback, could be enhanced with PDF.js
              }}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No PDF Loaded</p>
              <p className="text-sm">
                {isTeacher 
                  ? 'Upload a PDF to share with students' 
                  : 'Waiting for teacher to share a document'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 p-2 border-t border-gray-200 text-xs text-gray-600 text-center">
        {isTeacher ? 'Teacher View' : 'Student View'} • Room: {roomId}
      </div>
      </div>
    </div>
  );
};

export default PDFViewer;