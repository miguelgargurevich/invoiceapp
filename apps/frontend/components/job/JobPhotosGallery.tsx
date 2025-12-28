'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, X, Plus, Trash2, Maximize2, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { Button, Modal, Input, LoadingSpinner } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';

interface JobPhoto {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  orden: number;
}

interface JobPhotosGalleryProps {
  facturaId?: string;
  proformaId?: string;
  photos: JobPhoto[];
  onPhotosChange: () => void;
  readOnly?: boolean;
}

export default function JobPhotosGallery({
  facturaId,
  proformaId,
  photos,
  onPhotosChange,
  readOnly = false
}: JobPhotosGalleryProps) {
  const t = useTranslations('invoices');
  const { showSuccess, showError } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photo', file);
        
        if (facturaId) {
          formData.append('facturaId', facturaId);
        } else if (proformaId) {
          formData.append('proformaId', proformaId);
        }
        
        formData.append('orden', String(photos.length + i));

        await api.upload('/job-photos', formData);
      }
      
      showSuccess(files.length > 1 ? t('photosUploadedSuccess') : t('photoUploadedSuccess'));
      onPhotosChange();
    } catch (error) {
      console.error('Error uploading photos:', error);
      showError(t('photoUploadError'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm(t('confirmDeletePhoto'))) return;
    
    setDeleting(photoId);
    try {
      await api.delete(`/job-photos/${photoId}`);
      showSuccess(t('photoDeletedSuccess'));
      onPhotosChange();
    } catch (error) {
      console.error('Error deleting photo:', error);
      showError(t('photoDeleteError'));
    } finally {
      setDeleting(null);
    }
  };

  const openViewer = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  const navigateViewer = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else {
      setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload Button */}
        {!readOnly && (
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('jobPhotos')} ({photos.length})
            </h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-1" />
                    {t('addPhotos')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <img
                  src={photo.url}
                  alt={photo.descripcion || `Photo ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => openViewer(index)}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openViewer(index)}
                    className="p-2 bg-white/90 rounded-full mx-1 hover:bg-white transition-colors"
                    title={t('viewPhoto')}
                  >
                    <Maximize2 className="w-4 h-4 text-gray-700" />
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deleting === photo.id}
                      className="p-2 bg-red-500/90 rounded-full mx-1 hover:bg-red-600 transition-colors"
                      title={t('deletePhoto')}
                    >
                      {deleting === photo.id ? (
                        <LoadingSpinner size="sm" className="text-white" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Photo description */}
                {photo.descripcion && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <p className="text-xs text-white truncate">{photo.descripcion}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('noPhotosYet')}</p>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('addFirstPhoto')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      <Modal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title=""
        size="xl"
      >
        <div className="relative">
          {/* Close button */}
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Navigation - Previous */}
          {photos.length > 1 && (
            <button
              onClick={() => navigateViewer('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* Current Photo */}
          {photos[currentPhotoIndex] && (
            <div className="flex flex-col items-center">
              <img
                src={photos[currentPhotoIndex].url}
                alt={photos[currentPhotoIndex].descripcion || `Photo ${currentPhotoIndex + 1}`}
                className="max-h-[70vh] w-auto rounded-lg"
              />
              {photos[currentPhotoIndex].descripcion && (
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  {photos[currentPhotoIndex].descripcion}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {currentPhotoIndex + 1} / {photos.length}
              </p>
            </div>
          )}
          
          {/* Navigation - Next */}
          {photos.length > 1 && (
            <button
              onClick={() => navigateViewer('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
