import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Upload, 
  Check, 
  Loader2,
  FlipHorizontal,
  ZoomIn,
  ImagePlus
} from 'lucide-react';
import { useAddFile } from '@/hooks/useDataSources';
import { useProjects } from '@/hooks/useProjects';

interface DocumentScannerProps {
  defaultProjectId?: string;
  onComplete?: (documentId: string) => void;
}

export function DocumentScanner({ defaultProjectId, onComplete }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [selectedProject, setSelectedProject] = useState(defaultProjectId || '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: projects } = useProjects();
  const addFileMutation = useAddFile(selectedProject);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
      setIsCapturing(true);
    } catch (error) {
      console.error('Camera access error:', error);
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // Camera will restart with new facing mode
    setTimeout(() => startCamera(), 100);
  }, [stopCamera, startCamera]);

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Apply some basic image enhancement for document scanning
    // Increase contrast slightly
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Increase contrast
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128)); // B
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Convert to data URL
    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageUrl);
    stopCamera();
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Handle file selection from gallery
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload captured image
  const uploadImage = useCallback(async () => {
    if (!capturedImage || !selectedProject) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create file from blob
      const fileName = `scan-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload file
      await addFileMutation.mutateAsync(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset state after short delay
      setTimeout(() => {
        setCapturedImage(null);
        setIsUploading(false);
        setUploadProgress(0);
        if (onComplete) {
          onComplete('new-document-id'); // Would be actual ID from response
        }
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [capturedImage, selectedProject, addFileMutation, onComplete]);

  return (
    <div className="flex flex-col h-full">
      {/* Camera View */}
      {isCapturing && !capturedImage && (
        <div className="relative flex-1 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Camera overlay grid */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full border-2 border-white/30">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/20" />
            </div>
          </div>

          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-around">
              <Button
                variant="ghost"
                size="icon"
                className="text-white h-12 w-12"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-6 w-6" />
              </Button>
              
              <Button
                size="icon"
                className="h-16 w-16 rounded-full bg-white text-black hover:bg-white/90"
                onClick={captureImage}
              >
                <Camera className="h-8 w-8" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white h-12 w-12"
                onClick={switchCamera}
              >
                <FlipHorizontal className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={stopCamera}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Preview captured image */}
      {capturedImage && (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 bg-black">
            <img
              src={capturedImage}
              alt="Captured document"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="p-4 space-y-4 bg-background">
            {/* Project selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add to Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects as any)?.data?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  )) || (projects as any)?.map?.((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={retakePhoto}
                disabled={isUploading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                className="flex-1"
                onClick={uploadImage}
                disabled={!selectedProject || isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : uploadProgress === 100 ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Initial state - start scanning */}
      {!isCapturing && !capturedImage && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Camera className="h-6 w-6" />
                Document Scanner
              </CardTitle>
              <CardDescription>
                Capture documents with your camera for instant processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" size="lg" onClick={startCamera}>
                <Camera className="h-5 w-5 mr-2" />
                Start Scanning
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-5 w-5 mr-2" />
                Choose from Gallery
              </Button>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground max-w-xs">
            <p>For best results, ensure good lighting and hold the camera steady over your document.</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
