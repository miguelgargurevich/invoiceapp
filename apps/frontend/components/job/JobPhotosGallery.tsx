'use client';

import { useState, useRef, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Camera, X, Plus, Trash2, Maximize2, ChevronLeft, ChevronRight, Image, Calendar, User, FileText } from 'lucide-react';
import { Button, Modal, LoadingSpinner, ConfirmDialog } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';

interface JobPhoto {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  orden: number;
}

interface ClientInfo {
  razonSocial: string;
  numeroDocumento?: string;
  direccion?: string;
  email?: string;
}

interface InvoiceInfo {
  numero: string;
  serie: string;
  fechaEmision: string;
}

interface JobPhotosGalleryProps {
  facturaId?: string;
  proformaId?: string;
  photos: JobPhoto[];
  onPhotosChange: () => void;
  readOnly?: boolean;
  clientInfo?: ClientInfo;
  invoiceInfo?: InvoiceInfo;
  onClose?: () => void;
}

export default function JobPhotosGallery({
  facturaId,
  proformaId,
  photos,
  onPhotosChange,
  readOnly = false,
  clientInfo,
  invoiceInfo,
  onClose
}: JobPhotosGalleryProps) {
  const t = useTranslations('jobPhotos');
  const locale = useLocale();
  const { showSuccess, showError } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group photos by date
  const photosByDate = useMemo(() => {
    const grouped = photos.reduce((acc, photo) => {
      // Parse date in local timezone to avoid day shifting
      const photoDate = new Date(photo.fecha);
      const dateStr = `${photoDate.getFullYear()}-${String(photoDate.getMonth() + 1).padStart(2, '0')}-${String(photoDate.getDate()).padStart(2, '0')}`;
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(photo);
      return acc;
    }, {} as Record<string, JobPhoto[]>);

    // Sort dates descending (newest first)
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map(date => {
        // Create date from components to avoid timezone issues
        const [year, month, day] = date.split('-').map(Number);
        const displayDate = new Date(year, month - 1, day);
        return {
          date,
          displayDate: displayDate.toLocaleDateString(locale, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          photos: grouped[date].sort((a, b) => a.orden - b.orden)
        };
      });
  }, [photos, locale]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      
      // Check for specific error messages
      const errorMessage = error?.response?.data?.error || error?.message || '';
      
      if (errorMessage.includes('Invalid file type') || errorMessage.includes('file type')) {
        showError(t('invalidFileType'));
      } else if (errorMessage.includes('File size too large') || errorMessage.includes('LIMIT_FILE_SIZE')) {
        showError(t('fileTooLarge'));
      } else {
        showError(t('uploadError'));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setPhotoToDelete(photoId);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    
    setDeleting(photoToDelete);
    try {
      await api.delete(`/job-photos/${photoToDelete}`);
      showSuccess(t('photoDeletedSuccess'));
      onPhotosChange();
    } catch (error) {
      console.error('Error deleting photo:', error);
      showError(t('photoDeleteError'));
    } finally {
      setDeleting(null);
      setPhotoToDelete(null);
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
      <div className="space-y-6 relative">

        {/* Client & Invoice Info Header */}
        {(clientInfo || invoiceInfo) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientInfo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Client Information</span>
                  </div>
                  <div className="ml-6 space-y-1 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{clientInfo.razonSocial}</p>
                    {clientInfo.numeroDocumento && (
                      <p className="text-gray-600 dark:text-gray-400">ID: {clientInfo.numeroDocumento}</p>
                    )}
                    {clientInfo.direccion && (
                      <p className="text-gray-600 dark:text-gray-400">{clientInfo.direccion}</p>
                    )}
                    {clientInfo.email && (
                      <p className="text-gray-600 dark:text-gray-400">{clientInfo.email}</p>
                    )}
                  </div>
                </div>
              )}
              {invoiceInfo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Invoice Details</span>
                  </div>
                  <div className="ml-6 space-y-1 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {invoiceInfo.serie}-{invoiceInfo.numero}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Issued: {formatDate(invoiceInfo.fechaEmision)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {!readOnly && (
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              {t('photosInformation')} ({photos.length})
            </div>
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
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addPhotos')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Photos Grouped by Date */}
        {photosByDate.length > 0 ? (
          <div className="space-y-6">
            {photosByDate.map((group) => (
              <div key={group.date} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {group.displayDate}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.photos.length} {group.photos.length === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>
                </div>

                {/* Photos Grid for this date */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.photos.map((photo) => {
                    const photoIndex = photos.findIndex(p => p.id === photo.id);
                    return (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
                      >
                        <img
                          src={photo.url}
                          alt={photo.descripcion || `Photo`}
                          className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-110"
                          onClick={() => {
                            setCurrentPhotoIndex(photoIndex);
                            openViewer(photoIndex);
                          }}
                        />
                        
                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button
                            onClick={() => {
                              setCurrentPhotoIndex(photoIndex);
                              openViewer(photoIndex);
                            }}
                            className="p-2.5 bg-white/95 rounded-full mx-1 hover:bg-white hover:scale-110 transition-all shadow-lg"
                            title={t('viewPhoto')}
                          >
                            <Maximize2 className="w-5 h-5 text-gray-700" />
                          </button>
                          {!readOnly && (
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              disabled={deleting === photo.id}
                              className="p-2.5 bg-red-500/95 rounded-full mx-1 hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                              title={t('deletePhoto')}
                            >
                              {deleting === photo.id ? (
                                <LoadingSpinner size="sm" className="text-white" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-white" />
                              )}
                            </button>
                          )}
                        </div>
                        
                        {/* Photo description */}
                        {photo.descripcion && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-xs text-white font-medium truncate">{photo.descripcion}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">{t('noPhotosYet')}</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">{t('noPhotosDescription')}</p>
            {!readOnly && (
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstPhoto')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal - Larger Size */}
      <Modal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title=""
        size="full"
      >
        <div className="relative h-[85vh]">
          {/* Client & Invoice Info in Viewer */}
          {(clientInfo || invoiceInfo) && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {clientInfo && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{clientInfo.razonSocial}</span>
                    {clientInfo.numeroDocumento && (
                      <span className="text-gray-600 dark:text-gray-400">• {clientInfo.numeroDocumento}</span>
                    )}
                  </div>
                )}
                {invoiceInfo && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {invoiceInfo.serie}-{invoiceInfo.numero}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">• {formatDate(invoiceInfo.fechaEmision)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-30 p-3 bg-black/70 backdrop-blur-sm rounded-full text-white hover:bg-black/90 transition-all shadow-xl"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Navigation - Previous */}
          {photos.length > 1 && (
            <button
              onClick={() => navigateViewer('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/70 backdrop-blur-sm rounded-full text-white hover:bg-black/90 transition-all shadow-xl"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}
          
          {/* Current Photo */}
          {photos[currentPhotoIndex] && (
            <div className="flex flex-col items-center justify-center h-full pt-20 pb-16">
              <img
                src={photos[currentPhotoIndex].url}
                alt={photos[currentPhotoIndex].descripcion || `Photo ${currentPhotoIndex + 1}`}
                className="max-h-[calc(85vh-160px)] max-w-full w-auto rounded-lg shadow-2xl"
              />
              <div className="mt-6 text-center max-w-2xl">
                {/* Photo Date */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(photos[currentPhotoIndex].fecha).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {photos[currentPhotoIndex].descripcion && (
                  <p className="text-base text-gray-600 dark:text-gray-400 mb-3">
                    {photos[currentPhotoIndex].descripcion}
                  </p>
                )}
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-500">
                  Photo {currentPhotoIndex + 1} of {photos.length}
                </p>
              </div>
            </div>
          )}
          
          {/* Navigation - Next */}
          {photos.length > 1 && (
            <button
              onClick={() => navigateViewer('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/70 backdrop-blur-sm rounded-full text-white hover:bg-black/90 transition-all shadow-xl"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={confirmDeletePhoto}
        title={t('confirmDeletePhoto')}
        message={t('confirmDeletePhotoMessage') || 'Are you sure you want to delete this photo?'}
        confirmLabel={t('delete') || 'Delete'}
        variant="danger"
      />
    </>
  );
}
