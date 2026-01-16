import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  isLoading = false,
  placeholder,
  className = '',
}: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('search.placeholder', 'Search documents...')}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.clear', 'Clear')}</span>
        </Button>
      )}
    </div>
  );
}
