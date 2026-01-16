import React from 'react';
import { useTranslation } from 'react-i18next';
import { Book, Search, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JurisdictionSelector, JurisdictionBadge } from './JurisdictionSelector';
import {
  useJurisdictionTerms,
  type JurisdictionRegion,
  type JurisdictionTerm,
} from '@/hooks/useLocalization';

interface JurisdictionTermsViewerProps {
  defaultJurisdiction?: JurisdictionRegion;
  onTermClick?: (term: JurisdictionTerm) => void;
}

export function JurisdictionTermsViewer({ 
  defaultJurisdiction = 'sau',
  onTermClick,
}: JurisdictionTermsViewerProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState<JurisdictionRegion>(defaultJurisdiction);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const { data: terms, isLoading } = useJurisdictionTerms(selectedJurisdiction);

  const filteredTerms = React.useMemo(() => {
    if (!terms) return [];
    if (!searchQuery) return terms;
    
    const query = searchQuery.toLowerCase();
    return terms.filter(term => 
      term.termKey.toLowerCase().includes(query) ||
      term.localTermAr.includes(searchQuery) ||
      term.localTermEn.toLowerCase().includes(query) ||
      term.descriptionAr?.includes(searchQuery) ||
      term.descriptionEn?.toLowerCase().includes(query)
    );
  }, [terms, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          {isRTL ? 'المصطلحات القانونية والتنظيمية' : 'Legal & Regulatory Terms'}
        </CardTitle>
        <CardDescription>
          {isRTL 
            ? 'قاموس المصطلحات الخاصة بكل سلطة قضائية'
            : 'Jurisdiction-specific terminology reference'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <JurisdictionSelector
              value={selectedJurisdiction}
              onChange={setSelectedJurisdiction}
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? 'البحث في المصطلحات...' : 'Search terms...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? 'لا توجد مصطلحات مطابقة' : 'No matching terms found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTerms.map((term) => (
                <TermCard 
                  key={term.id} 
                  term={term} 
                  isRTL={isRTL}
                  onClick={onTermClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TermCardProps {
  term: JurisdictionTerm;
  isRTL: boolean;
  onClick?: (term: JurisdictionTerm) => void;
}

function TermCard({ term, isRTL, onClick }: TermCardProps) {
  return (
    <div 
      className={`p-4 rounded-lg border hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(term)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              {term.termKey}
            </Badge>
            <JurisdictionBadge jurisdiction={term.jurisdiction} />
          </div>
          
          <div className="space-y-1">
            <p className="font-semibold" dir="rtl">
              {term.localTermAr}
            </p>
            <p className="text-sm text-muted-foreground">
              {term.localTermEn}
            </p>
          </div>
          
          {(term.descriptionAr || term.descriptionEn) && (
            <p className="text-sm text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
              {isRTL ? term.descriptionAr : term.descriptionEn}
            </p>
          )}
        </div>

        {term.legalReference && (
          <Button variant="ghost" size="icon" asChild>
            <a href={term.legalReference} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      {term.effectiveDate && (
        <p className="text-xs text-muted-foreground mt-2">
          {isRTL ? 'تاريخ السريان:' : 'Effective:'} {new Date(term.effectiveDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
