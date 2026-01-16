// PII Masking Panel - Detect and mask personally identifiable information

import { useState } from 'react';
import { usePIIRules, useDetectPII, useDocumentPIIDetections, type PIIDetection } from '@/hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  CreditCard, 
  User, 
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Scan
} from 'lucide-react';

const categoryIcons: Record<string, typeof Shield> = {
  email: Mail,
  phone: Phone,
  credit_card: CreditCard,
  name: User,
  address: MapPin,
  date_of_birth: Calendar,
  ssn: Shield,
  ip_address: Shield,
  medical: AlertTriangle,
  financial: CreditCard,
};

const severityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

interface PIIMaskingPanelProps {
  documentId?: string;
  initialText?: string;
  onMaskedTextChange?: (maskedText: string) => void;
}

export function PIIMaskingPanel({ documentId, initialText = '', onMaskedTextChange }: PIIMaskingPanelProps) {
  const [inputText, setInputText] = useState(initialText);
  const [showMasked, setShowMasked] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [detectionResults, setDetectionResults] = useState<ReturnType<ReturnType<typeof useDetectPII>['detect']>>([]);

  const { data: rules = [], isLoading: rulesLoading } = usePIIRules();
  const { detect, mask } = useDetectPII();
  const { data: savedDetections, isLoading: detectionsLoading } = useDocumentPIIDetections(documentId || '');

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const results = detect(inputText);
      setDetectionResults(results);
      setIsScanning(false);
    }, 500);
  };

  const maskedText = showMasked ? mask(inputText) : inputText;
  const totalDetections = detectionResults.reduce((acc, d) => acc + d.matches.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Shield - PII Detection
          </CardTitle>
          <CardDescription>
            Automatically detect and mask personally identifiable information before sending to AI providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Rules */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Active Detection Rules</Label>
            {rulesLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-20" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rules.map((rule) => {
                  const Icon = categoryIcons[rule.piiCategory] || Shield;
                  return (
                    <Badge 
                      key={rule.id} 
                      variant="outline" 
                      className={`${severityColors[rule.severity]} flex items-center gap-1`}
                    >
                      <Icon className="h-3 w-3" />
                      {rule.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text Input & Scan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Text Scanner
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="show-masked" checked={showMasked} onCheckedChange={setShowMasked} />
                <Label htmlFor="show-masked" className="text-sm">
                  {showMasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Label>
              </div>
              <Button onClick={handleScan} disabled={isScanning || !inputText}>
                {isScanning ? 'Scanning...' : 'Scan for PII'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Text */}
            <div>
              <Label className="text-sm mb-2 block">Original Text</Label>
              <Textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setDetectionResults([]);
                }}
                placeholder="Paste or type text to scan for PII..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Masked Text */}
            <div>
              <Label className="text-sm mb-2 block flex items-center justify-between">
                <span>Masked Output</span>
                {totalDetections > 0 && (
                  <Badge variant="outline" className="bg-success/10 text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {totalDetections} items masked
                  </Badge>
                )}
              </Label>
              <Textarea
                value={maskedText}
                readOnly
                className="min-h-[200px] font-mono text-sm bg-muted"
              />
            </div>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Scanning...</span>
                <span>Analyzing text for PII patterns</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Results */}
      {detectionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Detection Results
            </CardTitle>
            <CardDescription>
              Found {totalDetections} instances of PII across {detectionResults.length} categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectionResults.map(({ rule, matches }) => {
                const Icon = categoryIcons[rule.piiCategory] || Shield;
                return (
                  <div key={rule.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${severityColors[rule.severity]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={severityColors[rule.severity]}>
                          {rule.severity}
                        </Badge>
                        <Badge variant="outline">
                          {matches.length} found
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {matches.map((match, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                          <span className="text-sm font-mono line-through text-muted-foreground">
                            {match.text.slice(0, 20)}{match.text.length > 20 ? '...' : ''}
                          </span>
                          <span className="text-sm text-success">→</span>
                          <span className="text-sm font-mono text-success">{rule.maskReplacement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Detections for Document */}
      {documentId && (savedDetections?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Document PII History
            </CardTitle>
            <CardDescription>
              Previously detected PII in this document
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detectionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  (savedDetections || []).reduce((acc, d) => {
                    acc[d.piiCategory] = (acc[d.piiCategory] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([category, count]) => {
                  const Icon = categoryIcons[category] || Shield;
                  return (
                    <div key={category} className="flex items-center gap-2 p-3 rounded-lg border border-border">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">{category.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{count} detected</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PIIMaskingPanel;
