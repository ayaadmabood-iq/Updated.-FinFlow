import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { 
  Image, 
  Video, 
  Music, 
  FileImage, 
  Upload, 
  Search, 
  Grid3X3, 
  List,
  BarChart3,
  Table,
  Eye,
  Download,
  Trash2,
  Loader2,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaAssets, useCreateMediaAsset, useDeleteMediaAsset, useSearchMedia } from '@/hooks/useMedia';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { MediaType, MediaAsset } from '@/services/mediaService';

interface MediaGalleryProps {
  projectId: string;
}

export function MediaGallery({ projectId }: MediaGalleryProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: assets = [], isLoading } = useMediaAssets(projectId, {
    mediaType: mediaTypeFilter !== 'all' ? mediaTypeFilter : undefined,
  });

  const { data: searchResults = [] } = useSearchMedia(projectId, searchQuery);
  const createAsset = useCreateMediaAsset();
  const deleteAsset = useDeleteMediaAsset();

  const displayAssets = searchQuery.length > 2 ? searchResults : assets;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;
    setIsUploading(true);

    try {
      for (const file of acceptedFiles) {
        const mediaType = getMediaType(file.type);
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('media-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create asset record
        await createAsset.mutateAsync({
          project_id: projectId,
          user_id: user.id,
          media_type: mediaType,
          name: file.name,
          storage_path: fileName,
          file_size_bytes: file.size,
          mime_type: file.type,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [user, projectId, createAsset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
    },
  });

  const getMediaType = (mimeType: string): MediaType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image';
  };

  const getAssetUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('media-assets').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return <Image className="h-5 w-5" />;
      case 'chart': return <BarChart3 className="h-5 w-5" />;
      case 'diagram': return <FileImage className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      default: return <Image className="h-5 w-5" />;
    }
  };

  const handleDelete = async (assetId: string) => {
    if (confirm('Are you sure you want to delete this media asset?')) {
      await deleteAsset.mutateAsync(assetId);
      setSelectedAsset(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by content, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select 
            value={mediaTypeFilter} 
            onValueChange={(v) => setMediaTypeFilter(v as MediaType | 'all')}
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="chart">Charts</SelectItem>
              <SelectItem value="diagram">Diagrams</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isDragActive
                ? 'Drop files here...'
                : 'Drag and drop images, videos, or audio files, or click to browse'}
            </p>
          </>
        )}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : displayAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No media assets yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload images, videos, or audio files to get started
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayAssets.map((asset) => (
            <Card 
              key={asset.id} 
              className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all overflow-hidden"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="aspect-square relative bg-muted">
                {asset.media_type === 'image' || asset.media_type === 'chart' || asset.media_type === 'diagram' ? (
                  <img
                    src={getAssetUrl(asset.storage_path)}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : asset.media_type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant="secondary">
                  {getMediaIcon(asset.media_type)}
                </Badge>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{asset.name}</p>
                {asset.ai_tags && asset.ai_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.ai_tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayAssets.map((asset) => (
            <Card 
              key={asset.id} 
              className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedAsset(asset)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0">
                  {asset.media_type === 'image' || asset.media_type === 'chart' || asset.media_type === 'diagram' ? (
                    <img
                      src={getAssetUrl(asset.storage_path)}
                      alt={asset.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    getMediaIcon(asset.media_type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{asset.name}</p>
                  {asset.ai_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {asset.ai_description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{asset.media_type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asset Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                {/* Preview */}
                <div className="rounded-lg overflow-hidden bg-muted">
                  {selectedAsset.media_type === 'image' || 
                   selectedAsset.media_type === 'chart' || 
                   selectedAsset.media_type === 'diagram' ? (
                    <img
                      src={getAssetUrl(selectedAsset.storage_path)}
                      alt={selectedAsset.name}
                      className="w-full max-h-96 object-contain"
                    />
                  ) : selectedAsset.media_type === 'video' ? (
                    <video
                      src={getAssetUrl(selectedAsset.storage_path)}
                      controls
                      className="w-full max-h-96"
                    />
                  ) : (
                    <audio
                      src={getAssetUrl(selectedAsset.storage_path)}
                      controls
                      className="w-full p-4"
                    />
                  )}
                </div>

                {/* AI Description */}
                {selectedAsset.ai_description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedAsset.ai_description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {selectedAsset.ai_tags && selectedAsset.ai_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAsset.ai_tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Extracted Data */}
                {selectedAsset.extracted_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        Extracted Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                        {JSON.stringify(selectedAsset.extracted_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <a 
                      href={getAssetUrl(selectedAsset.storage_path)} 
                      download={selectedAsset.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDelete(selectedAsset.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
