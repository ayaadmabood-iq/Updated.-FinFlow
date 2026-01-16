import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mic, MicOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/hooks/useVoice';

interface VoiceChatButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  showTranscript?: boolean;
}

export function VoiceChatButton({ 
  onTranscript, 
  disabled = false,
  size = 'default',
  showTranscript = true
}: VoiceChatButtonProps) {
  const {
    isListening,
    isProcessing,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoice({
    language: 'auto',
    continuous: false,
    onFinalTranscript: (text) => {
      onTranscript(text);
      clearTranscript();
    },
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled className="opacity-50">
              <MicOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice input not supported in this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconClasses = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="relative inline-flex items-center">
      <Button
        variant={isListening ? 'default' : 'ghost'}
        size="icon"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={cn(
          sizeClasses[size],
          isListening && 'bg-destructive hover:bg-destructive/90 animate-pulse'
        )}
      >
        {isProcessing ? (
          <Loader2 className={cn(iconClasses[size], 'animate-spin')} />
        ) : isListening ? (
          <Mic className={iconClasses[size]} />
        ) : (
          <Mic className={iconClasses[size]} />
        )}
      </Button>

      {/* Live transcript indicator */}
      {showTranscript && isListening && transcript && (
        <div className="absolute left-full ml-2 whitespace-nowrap">
          <Badge variant="secondary" className="animate-pulse">
            {transcript.slice(0, 30)}...
          </Badge>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="absolute -bottom-8 left-0 right-0 text-center">
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}
    </div>
  );
}

interface ListenToSummaryButtonProps {
  text: string;
  language?: 'en' | 'ar';
  disabled?: boolean;
}

export function ListenToSummaryButton({ 
  text, 
  language = 'en',
  disabled = false 
}: ListenToSummaryButtonProps) {
  const {
    isSpeaking,
    speak,
    stopSpeaking,
  } = useVoice({});

  const handleClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text, language);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={disabled || !text}
            className={cn(isSpeaking && 'text-primary')}
          >
            {isSpeaking ? (
              <Volume2 className="h-5 w-5 animate-pulse" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSpeaking ? 'Stop' : 'Listen to summary'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
