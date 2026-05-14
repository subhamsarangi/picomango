import { useState, useCallback } from 'react';
import { compressImage } from '@/lib/imageCompression';

interface UseImageUploadResult {
  imageFile: File | null;
  imagePreview: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement> | File | DataTransfer) => Promise<void>;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handlePaste: (e: React.ClipboardEvent) => Promise<void>;
  removeImage: () => void;
  setImageFile: (file: File | null) => void;
  setImagePreview: (preview: string | null) => void;
}

export function useImageUpload(): UseImageUploadResult {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const compressedFile = await compressImage(file);
    setImageFile(compressedFile);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(compressedFile);
  }, []);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File | DataTransfer) => {
    let file: File | null = null;
    
    if (e instanceof File) {
      file = e;
    } else if ('target' in e && e.target instanceof HTMLInputElement && e.target.files?.[0]) {
      file = e.target.files[0];
    } else if ('files' in e && e.files?.[0]) {
      file = e.files[0];
    }

    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await processFile(file);
          break; // Process only the first image
        }
      }
    }
  }, [processFile]);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
  }, []);

  return {
    imageFile,
    imagePreview,
    handleImageChange,
    handleDrop,
    handlePaste,
    removeImage,
    setImageFile,
    setImagePreview
  };
}
