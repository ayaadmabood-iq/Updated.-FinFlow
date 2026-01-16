import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Image as ImageIcon, 
  X, 
  Crop, 
  Loader2, 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAnalyzeImage } from '@/hooks/useMedia';

interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PointAndAskProps {
  imageUrl: string;
  projectId: string;
  onClose?: () => void;
}

export function PointAndAsk({ imageUrl, projectId, onClose }: PointAndAskProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<ImageRegion | null>(null);
  const [question, setQuestion] = useState('');
  const [scale, setScale] = useState(1);
  const [analysis, setAnalysis] = useState<{
    description: string;
    tags: string[];
    extractedData?: Record<string, unknown>;
  } | null>(null);

  const analyzeImage = useAnalyzeImage();

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectedRegion(null);
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart || !canvasRef.current || !imageRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    const region = {
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    };
    
    // Draw selection rectangle
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && imageRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(imageRef.current, 0, 0);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(region.x, region.y, region.width, region.height);
    }
    
    setSelectedRegion(region);
  }, [isSelecting, selectionStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setSelectionStart(null);
  }, []);

  const handleImageLoad = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;
    
    canvasRef.current.width = imageRef.current.naturalWidth;
    canvasRef.current.height = imageRef.current.naturalHeight;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.drawImage(imageRef.current, 0, 0);
    }
  }, []);

  const handleAsk = async () => {
    try {
      const result = await analyzeImage.mutateAsync({
        projectId,
        imageUrl,
        prompt: question || undefined,
        selectedRegion: selectedRegion || undefined,
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const clearSelection = () => {
    setSelectedRegion(null);
    if (canvasRef.current && imageRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(imageRef.current, 0, 0);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(Math.max(0.5, scale - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(Math.min(3, scale + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={clearSelection}
            disabled={!selectedRegion}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedRegion && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Crop className="h-3 w-3" />
            Region selected
          </Badge>
        )}
        
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Image Canvas */}
        <div className="flex-1 overflow-auto p-4 bg-muted/50">
          <div 
            className="inline-block" 
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Image to analyze"
              className="hidden"
              onLoad={handleImageLoad}
            />
            <canvas
              ref={canvasRef}
              className="cursor-crosshair border rounded shadow-lg"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        {/* Question Panel */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Ask about this image</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a region by clicking and dragging, then ask your question
            </p>
            
            <div className="space-y-3">
              <Input
                placeholder="What does this show?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <Button 
                className="w-full" 
                onClick={handleAsk}
                disabled={analyzeImage.isPending}
              >
                {analyzeImage.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Analysis Results */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {analysis ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.description}
                      </p>
                    </CardContent>
                  </Card>

                  {analysis.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.extractedData && (
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2">Extracted Data</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(analysis.extractedData, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Select a region or ask a question to analyze the image
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
