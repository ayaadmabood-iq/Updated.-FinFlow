import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Flag,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DocumentAnomaly } from '@/services/analyticsService';
import { formatDistanceToNow } from 'date-fns';

interface AnomalyAlertsProps {
  anomalies: DocumentAnomaly[];
  isLoading: boolean;
  onDetect: () => void;
  onResolve: (anomalyId: string, notes: string) => void;
  isDetecting: boolean;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500' },
  medium: { icon: Flag, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500' },
  low: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500' },
};

const anomalyTypeLabels: Record<string, string> = {
  contradiction: 'Contradiction',
  missing_data: 'Missing Data',
  inconsistency: 'Inconsistency',
  compliance_gap: 'Compliance Gap',
  duplicate: 'Duplicate',
  outlier: 'Outlier',
};

export function AnomalyAlerts({
  anomalies,
  isLoading,
  onDetect,
  onResolve,
  isDetecting,
}: AnomalyAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<DocumentAnomaly | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const highCount = anomalies.filter((a) => a.severity === 'high').length;

  const handleResolve = () => {
    if (selectedAnomaly && resolutionNotes.trim()) {
      onResolve(selectedAnomaly.id, resolutionNotes);
      setResolveDialogOpen(false);
      setSelectedAnomaly(null);
      setResolutionNotes('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Red Flags & Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading anomalies...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Red Flags & Anomalies
                {(criticalCount > 0 || highCount > 0) && (
                  <Badge variant="destructive" className="ml-2">
                    {criticalCount + highCount} urgent
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Detected contradictions and inconsistencies across documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDetect}
              disabled={isDetecting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isDetecting ? 'animate-spin' : ''}`} />
              Scan for Anomalies
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-4 text-green-500 opacity-50" />
              <p className="font-medium">No anomalies detected</p>
              <p className="text-sm">Your documents appear consistent</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {anomalies.map((anomaly) => {
                const config = severityConfig[anomaly.severity];
                const Icon = config.icon;
                const isExpanded = expandedId === anomaly.id;

                return (
                  <div
                    key={anomaly.id}
                    className={`rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} overflow-hidden`}
                  >
                    <button
                      className="w-full p-3 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{anomaly.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {anomalyTypeLabels[anomaly.anomaly_type] || anomaly.anomaly_type}
                              </Badge>
                              <Badge
                                variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {anomaly.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-border/50">
                        <div className="mt-3 space-y-3">
                          {anomaly.field_name && (
                            <div className="text-sm">
                              <span className="font-medium">Field:</span>{' '}
                              <span className="text-muted-foreground">{anomaly.field_name}</span>
                            </div>
                          )}

                          {anomaly.source_value && (
                            <div className="p-2 rounded bg-background/50">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Source Value:
                              </div>
                              <div className="text-sm font-mono">{anomaly.source_value}</div>
                            </div>
                          )}

                          {anomaly.conflicting_value && (
                            <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Conflicting Value:
                              </div>
                              <div className="text-sm font-mono">{anomaly.conflicting_value}</div>
                            </div>
                          )}

                          {anomaly.confidence_score && (
                            <div className="text-sm">
                              <span className="font-medium">Confidence:</span>{' '}
                              <span className="text-muted-foreground">{anomaly.confidence_score}%</span>
                            </div>
                          )}

                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnomaly(anomaly);
                              setResolveDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Resolved
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Anomaly</DialogTitle>
            <DialogDescription>
              Provide notes on how this anomaly was resolved or why it's not an issue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAnomaly && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{selectedAnomaly.title}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAnomaly.description}
                </p>
              </div>
            )}
            <Textarea
              placeholder="Explain how this was resolved..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNotes.trim()}>
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
