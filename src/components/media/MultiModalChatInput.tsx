import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Image as ImageIcon, 
  Upload, 
  X, 
  Eye,
  Loader2,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { PointAndAsk } from './PointAndAsk';
import { useUploadChatImage, useAnalyzeImage } from '@/hooks/useMedia';
import { useAuth } from '@/hooks/useAuth';

interface ImageUpload {
  file: File;
  preview: string;
  uploaded?: boolean;
  url?: string;
}

interface MultiModalChatInputProps {
  projectId: string;
  threadId?: string;
  onSendMessage: (message: string, imageUrls?: string[]) => void;
  disabled?: boolean;
}

export function MultiModalChatInput({ 
  projectId, 
  threadId, 
  onSendMessage,
  disabled 
}: MultiModalChatInputProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [pendingImages, setPendingImages] = useState<ImageUpload[]>([]);
  const [selectedImageForAnalysis, setSelectedImageForAnalysis] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useUploadChatImage();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    const newImages: ImageUpload[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setPendingImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setPendingImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSend = async () => {
    if (!message.trim() && pendingImages.length === 0) return;
    if (!user) return;

    setIsUploading(true);

    try {
      // Upload any pending images
      const imageUrls: string[] = [];
      for (const img of pendingImages) {
        if (!img.uploaded) {
          const result = await uploadImage.mutateAsync({
            projectId,
            userId: user.id,
            file: img.file,
            threadId,
          });
          imageUrls.push(result.storage_path);
        } else if (img.url) {
          imageUrls.push(img.url);
        }
      }

      onSendMessage(message, imageUrls.length > 0 ? imageUrls : undefined);
      setMessage('');
      setPendingImages([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="border rounded-lg">
        {/* Pending Images */}
        {pendingImages.length > 0 && (
          <div className="p-3 border-b flex gap-2 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img.preview}
                  alt={`Upload ${i + 1}`}
                  className="h-20 w-20 object-cover rounded border"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => setSelectedImageForAnalysis(img.preview)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => removeImage(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or drop an image..."
            className="min-h-[40px] max-h-32 resize-none border-0 focus-visible:ring-0"
            disabled={disabled || isUploading}
          />

          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isUploading || (!message.trim() && pendingImages.length === 0)}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Point and Ask Dialog */}
      <Dialog 
        open={!!selectedImageForAnalysis} 
        onOpenChange={() => setSelectedImageForAnalysis(null)}
      >
        <DialogContent className="max-w-5xl h-[80vh] p-0">
          {selectedImageForAnalysis && (
            <PointAndAsk
              imageUrl={selectedImageForAnalysis}
              projectId={projectId}
              onClose={() => setSelectedImageForAnalysis(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
