import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface NextWordPredictorProps {
  placeholder?: string;
  showProbabilities?: boolean;
}

interface Prediction {
  word: string;
  probability: number;
}

// Simple mock predictions based on input patterns
const generatePredictions = (text: string, isArabic: boolean): Prediction[] => {
  const lastWord = text.split(' ').pop()?.toLowerCase() || '';
  
  // Arabic predictions
  if (isArabic || /[\u0600-\u06FF]/.test(text)) {
    if (text.includes('القط جلس على')) {
      return [
        { word: 'السجادة', probability: 45 },
        { word: 'الأريكة', probability: 30 },
        { word: 'الأرض', probability: 15 },
        { word: 'السرير', probability: 10 },
      ];
    }
    if (text.includes('السماء')) {
      return [
        { word: 'زرقاء', probability: 55 },
        { word: 'صافية', probability: 25 },
        { word: 'جميلة', probability: 12 },
        { word: 'ملبدة', probability: 8 },
      ];
    }
    return [
      { word: 'و', probability: 35 },
      { word: 'في', probability: 25 },
      { word: 'من', probability: 20 },
      { word: 'على', probability: 20 },
    ];
  }
  
  // English predictions
  if (text.toLowerCase().includes('the cat sat on the')) {
    return [
      { word: 'mat', probability: 45 },
      { word: 'couch', probability: 30 },
      { word: 'floor', probability: 15 },
      { word: 'bed', probability: 10 },
    ];
  }
  if (text.toLowerCase().includes('artificial')) {
    return [
      { word: 'intelligence', probability: 75 },
      { word: 'neural', probability: 10 },
      { word: 'learning', probability: 10 },
      { word: 'systems', probability: 5 },
    ];
  }
  if (lastWord === 'the') {
    return [
      { word: 'same', probability: 15 },
      { word: 'first', probability: 12 },
      { word: 'best', probability: 10 },
      { word: 'most', probability: 8 },
    ];
  }
  
  return [
    { word: 'the', probability: 20 },
    { word: 'and', probability: 18 },
    { word: 'is', probability: 15 },
    { word: 'to', probability: 12 },
  ];
};

export function NextWordPredictor({ 
  placeholder, 
  showProbabilities = true 
}: NextWordPredictorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [text, setText] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    setIsTyping(true);
    const timer = setTimeout(() => {
      setPredictions(generatePredictions(text, isRTL));
      setIsTyping(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [text, isRTL]);

  const getBarColor = (probability: number) => {
    if (probability > 40) return 'bg-green-500';
    if (probability > 20) return 'bg-yellow-500';
    return 'bg-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || t('learn.typeSentence', 'Type a sentence...')}
          className="pe-10"
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        <Sparkles 
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-opacity ${
            isTyping ? 'opacity-100 animate-pulse' : 'opacity-50'
          } ${isRTL ? 'left-3' : 'right-3'}`}
        />
      </div>

      {predictions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {t('learn.nextWordPredictions', 'Next word predictions:')}
          </div>
          
          <div className="space-y-2">
            {predictions.map((pred, index) => (
              <div 
                key={pred.word}
                className="flex items-center gap-3"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Badge 
                  variant="outline" 
                  className="min-w-[80px] justify-center"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {pred.word}
                </Badge>
                
                {showProbabilities && (
                  <>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getBarColor(pred.probability)}`}
                        style={{ width: `${pred.probability}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-end">
                      {pred.probability}%
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {text.length > 0 && text.length < 3 && (
        <p className="text-sm text-muted-foreground">
          {t('learn.keepTyping', 'Keep typing to see predictions...')}
        </p>
      )}

      {text.length === 0 && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('learn.tryExample', 'Try these examples:')}</p>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => setText('The cat sat on the')}
            >
              The cat sat on the
            </Badge>
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => setText('القط جلس على ال')}
            >
              القط جلس على ال
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
