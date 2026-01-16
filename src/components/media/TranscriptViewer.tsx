import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText,
  Download,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MediaTranscription } from '@/services/mediaService';

interface TranscriptViewerProps {
  transcription: MediaTranscription;
}

interface Segment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

interface Keyframe {
  timestamp: number;
  description: string;
  significance?: string;
}

export function TranscriptViewer({ transcription }: TranscriptViewerProps) {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (transcription.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const segments = (transcription.transcript_segments as { segments?: Segment[] })?.segments || [];
  const keyframes = (transcription.keyframes as { frames?: Keyframe[] })?.frames || [];

  const exportAsText = () => {
    const text = transcription.transcript_text || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsSrt = () => {
    if (segments.length === 0) return;
    
    const srt = segments.map((seg, i) => {
      const startTime = formatSrtTime(seg.startTime);
      const endTime = formatSrtTime(seg.endTime);
      return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    }).join('\n');
    
    const blob = new Blob([srt], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSrtTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Transcript</CardTitle>
            {getStatusIcon()}
          </div>
          
          {transcription.status === 'completed' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportAsText}>
                <Download className="h-4 w-4 mr-2" />
                TXT
              </Button>
              {segments.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportAsSrt}>
                  <Download className="h-4 w-4 mr-2" />
                  SRT
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transcription.status === 'pending' && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Waiting to start transcription...</p>
          </div>
        )}

        {transcription.status === 'processing' && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
            <p>Transcribing media...</p>
          </div>
        )}

        {transcription.status === 'failed' && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">{transcription.error_message || 'Transcription failed'}</p>
          </div>
        )}

        {transcription.status === 'completed' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              {transcription.language && (
                <Badge variant="secondary">
                  {transcription.language}
                </Badge>
              )}
              {transcription.duration_seconds && (
                <Badge variant="outline">
                  {formatTime(Number(transcription.duration_seconds))}
                </Badge>
              )}
              {transcription.word_count && (
                <Badge variant="outline">
                  {transcription.word_count} words
                </Badge>
              )}
            </div>

            {/* Visual Summary for Videos */}
            {transcription.visual_summary && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Visual Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {transcription.visual_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Keyframes */}
            {keyframes.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Key Moments
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {keyframes.map((kf, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <Badge variant="outline" className="shrink-0">
                          {formatTime(kf.timestamp)}
                        </Badge>
                        <p className="text-muted-foreground">{kf.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript */}
            <ScrollArea className="h-64 border rounded p-4">
              {segments.length > 0 ? (
                <div className="space-y-3">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {formatTime(seg.startTime)}
                      </Badge>
                      {seg.speaker && (
                        <Badge variant="secondary" className="shrink-0">
                          {seg.speaker}
                        </Badge>
                      )}
                      <p className="text-sm">{seg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {transcription.transcript_text || 'No transcript available'}
                </p>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
