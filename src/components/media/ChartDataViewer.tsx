import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table,
  Download,
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table as UITable, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import type { VisualExtraction } from '@/services/mediaService';

interface ChartDataViewerProps {
  extraction: VisualExtraction;
}

export function ChartDataViewer({ extraction }: ChartDataViewerProps) {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (extraction.status) {
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

  const tableData = (extraction.structured_table as { rows?: Record<string, unknown>[] })?.rows || [];
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  const exportAsCsv = () => {
    if (tableData.length === 0) return;
    
    const headers = columns.join(',');
    const rows = tableData.map(row => 
      columns.map(col => JSON.stringify(row[col] ?? '')).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJson = () => {
    const json = JSON.stringify(extraction.extracted_data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-lg">Chart Data Extraction</CardTitle>
            {getStatusIcon()}
          </div>
          
          {extraction.status === 'completed' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportAsCsv}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsJson}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {extraction.status === 'pending' && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Waiting to start extraction...</p>
          </div>
        )}

        {extraction.status === 'processing' && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
            <p>Extracting data from chart...</p>
          </div>
        )}

        {extraction.status === 'failed' && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">{extraction.error_message || 'Extraction failed'}</p>
          </div>
        )}

        {extraction.status === 'completed' && (
          <div className="space-y-4">
            {/* Chart Info */}
            <div className="flex flex-wrap gap-2">
              {extraction.chart_type && (
                <Badge variant="secondary">
                  {extraction.chart_type} chart
                </Badge>
              )}
              {extraction.confidence_score && (
                <Badge variant="outline">
                  {Math.round(extraction.confidence_score * 100)}% confidence
                </Badge>
              )}
              {extraction.data_labels && (
                <Badge variant="outline">
                  {extraction.data_labels.length} data points
                </Badge>
              )}
            </div>

            {/* Data Table */}
            {tableData.length > 0 ? (
              <ScrollArea className="h-64 border rounded">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      {columns.map(col => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map(col => (
                          <TableCell key={col}>
                            {String(row[col] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tabular data extracted</p>
              </div>
            )}

            {/* Raw Data Preview */}
            {extraction.extracted_data && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View raw extracted data
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(extraction.extracted_data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
