import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDocumentAnnotations,
  useCreateAnnotation,
  useResolveAnnotation,
} from '@/hooks/useCollaboration';
import { useAuth } from '@/hooks/useAuth';
import {
  Highlighter,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AnnotationType = Database['public']['Enums']['annotation_type'];

interface DocumentAnnotationsProps {
  documentId: string;
  teamId?: string;
  selectedText?: string;
  onAnnotationCreated?: () => void;
}

const annotationTypeConfig: Record<AnnotationType, { icon: React.ElementType; color: string; label: string }> = {
  highlight: { icon: Highlighter, color: 'bg-yellow-500/20 text-yellow-600', label: 'Highlight' },
  comment: { icon: MessageSquare, color: 'bg-blue-500/20 text-blue-600', label: 'Comment' },
  question: { icon: HelpCircle, color: 'bg-purple-500/20 text-purple-600', label: 'Question' },
  critical: { icon: AlertTriangle, color: 'bg-red-500/20 text-red-600', label: 'Critical' },
  action_item: { icon: CheckCircle2, color: 'bg-green-500/20 text-green-600', label: 'Action Item' },
};

export function DocumentAnnotations({
  documentId,
  teamId,
  selectedText,
  onAnnotationCreated,
}: DocumentAnnotationsProps) {
  const { user } = useAuth();
  const { data: annotations, isLoading } = useDocumentAnnotations(documentId, teamId);
  const { mutate: createAnnotation, isPending: isCreating } = useCreateAnnotation();
  const { mutate: resolveAnnotation } = useResolveAnnotation();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAnnotationType, setNewAnnotationType] = useState<AnnotationType>('comment');
  const [newContent, setNewContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const handleCreate = () => {
    if (!newContent.trim()) return;

    createAnnotation(
      {
        documentId,
        teamId,
        annotationType: newAnnotationType,
        content: newContent,
        selectedText,
      },
      {
        onSuccess: () => {
          setNewContent('');
          setIsAddingNew(false);
          onAnnotationCreated?.();
        },
      }
    );
  };

  const filteredAnnotations = annotations?.filter((a) => {
    if (filter === 'unresolved') return !a.is_resolved;
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  const groupedAnnotations = filteredAnnotations?.reduce((acc, annotation) => {
    const type = annotation.annotation_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(annotation);
    return acc;
  }, {} as Record<string, typeof annotations>);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Annotations</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={isAddingNew ? 'secondary' : 'default'}
              onClick={() => setIsAddingNew(!isAddingNew)}
            >
              {isAddingNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* New annotation form */}
        {isAddingNew && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            {selectedText && (
              <div className="p-2 bg-background rounded border text-sm italic">
                "{selectedText.slice(0, 100)}..."
              </div>
            )}
            
            <Select
              value={newAnnotationType}
              onValueChange={(v) => setNewAnnotationType(v as AnnotationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(annotationTypeConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <config.icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Add your annotation..."
              rows={3}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newContent.trim() || isCreating}
              >
                Add Annotation
              </Button>
            </div>
          </div>
        )}

        {/* Annotations list */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading annotations...</p>
          ) : !filteredAnnotations || filteredAnnotations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No annotations yet. Select text and add annotations to collaborate.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAnnotations || {}).map(([type, typeAnnotations]) => {
                const config = annotationTypeConfig[type as AnnotationType];
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {typeAnnotations?.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 ml-6">
                      {typeAnnotations?.map((annotation) => (
                        <div
                          key={annotation.id}
                          className={`p-3 rounded-lg border ${
                            annotation.is_resolved
                              ? 'bg-muted/50 opacity-60'
                              : 'bg-card'
                          }`}
                        >
                          {annotation.selected_text && (
                            <p className="text-xs italic text-muted-foreground mb-2 border-l-2 pl-2">
                              "{annotation.selected_text.slice(0, 80)}..."
                            </p>
                          )}
                          
                          <p className="text-sm">{annotation.content}</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {annotation.user_id.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(annotation.created_at), 'MMM d, HH:mm')}
                              </span>
                            </div>
                            
                            {!annotation.is_resolved && annotation.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => resolveAnnotation({ annotationId: annotation.id })}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                            
                            {annotation.is_resolved && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
