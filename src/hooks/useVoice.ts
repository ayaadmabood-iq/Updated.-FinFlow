import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

interface UseVoiceOptions {
  language?: 'en-US' | 'ar-SA' | 'auto';
  continuous?: boolean;
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { 
    language = 'auto', 
    continuous = false,
    onTranscript,
    onFinalTranscript 
  } = options;

  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Check if Web Speech API is supported
  const isSupported = useCallback(() => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  // Start listening with Web Speech API
  const startListening = useCallback(async () => {
    if (!isSupported()) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = continuous;
      recognition.interimResults = true;
      
      // Set language
      if (language === 'auto') {
        recognition.lang = navigator.language;
      } else {
        recognition.lang = language;
      }

      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setState(prev => ({ ...prev, transcript: currentTranscript }));
        
        if (interimTranscript && onTranscript) {
          onTranscript(interimTranscript);
        }
        
        if (finalTranscript && onFinalTranscript) {
          onFinalTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setState(prev => ({ 
          ...prev, 
          isListening: false, 
          error: event.error === 'not-allowed' 
            ? 'Microphone access denied' 
            : `Error: ${event.error}` 
        }));
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, [continuous, language, onTranscript, onFinalTranscript, isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Start recording for Whisper API (fallback/higher quality)
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Send to Whisper API via edge function
        setState(prev => ({ ...prev, isProcessing: true }));
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) throw error;
            
            setState(prev => ({ ...prev, transcript: data.text, isProcessing: false }));
            if (onFinalTranscript && data.text) {
              onFinalTranscript(data.text);
            }
          };
        } catch (error) {
          setState(prev => ({ 
            ...prev, 
            error: (error as Error).message, 
            isProcessing: false 
          }));
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState(prev => ({ ...prev, isListening: true, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Microphone access denied' }));
    }
  }, [onFinalTranscript]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Text-to-Speech using Web Speech API
  const speak = useCallback((text: string, voiceLang: 'en' | 'ar' = 'en') => {
    if (!synthRef.current) {
      setState(prev => ({ ...prev, error: 'Speech synthesis not supported' }));
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Try to find a matching voice
    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(voice => 
      voice.lang.startsWith(voiceLang === 'ar' ? 'ar' : 'en')
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true }));
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = (event) => {
      setState(prev => ({ ...prev, isSpeaking: false, error: event.error }));
    };

    synthRef.current.speak(utterance);
  }, []);

  // Text-to-Speech using OpenAI TTS (higher quality)
  const speakWithTTS = useCallback(async (text: string, voice: string = 'alloy') => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: { text, voice }
      });

      if (error) throw error;

      const audioData = `data:audio/mp3;base64,${data.audioContent}`;
      const audio = new Audio(audioData);
      audioRef.current = audio;

      audio.onplay = () => {
        setState(prev => ({ ...prev, isSpeaking: true, isProcessing: false }));
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
      };

      audio.onerror = () => {
        setState(prev => ({ ...prev, isSpeaking: false, error: 'Audio playback failed' }));
      };

      await audio.play();
    } catch (error) {
      setState(prev => ({ ...prev, isProcessing: false, error: (error as Error).message }));
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }));
  }, []);

  return {
    ...state,
    isSupported: isSupported(),
    startListening,
    stopListening,
    startRecording,
    stopRecording,
    speak,
    speakWithTTS,
    stopSpeaking,
    clearTranscript,
  };
}

// Type declarations for Web Speech API
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
