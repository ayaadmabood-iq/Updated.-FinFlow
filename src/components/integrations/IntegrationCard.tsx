import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Cloud, 
  Mail, 
  MessageSquare, 
  Webhook, 
  Settings, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Integration, IntegrationProvider } from '@/services/integrationService';
import { useUpdateIntegration, useDeleteIntegration, useTestWebhook } from '@/hooks/useIntegrations';

const providerConfig: Record<IntegrationProvider, {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  eventTypes: { value: string; label: string }[];
}> = {
  google_drive: {
    name: 'Google Drive',
    description: 'Auto-import documents from watched folders',
    icon: <Cloud className="h-6 w-6" />,
    color: 'bg-blue-500',
    eventTypes: [
      { value: 'all', label: 'All events' },
      { value: 'document_processed', label: 'Document processed' },
      { value: 'error', label: 'Errors only' }
    ]
  },
  gmail: {
    name: 'Gmail',
    description: 'Import attachments from labeled emails',
    icon: <Mail className="h-6 w-6" />,
    color: 'bg-red-500',
    eventTypes: [
      { value: 'all', label: 'All events' },
      { value: 'document_processed', label: 'Document processed' },
      { value: 'error', label: 'Errors only' }
    ]
  },
  slack: {
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'bg-purple-500',
    eventTypes: [
      { value: 'all', label: 'All events' },
      { value: 'document_processed', label: 'Document processed' },
      { value: 'research_complete', label: 'Research completed' },
      { value: 'conflict_detected', label: 'Conflicts detected' },
      { value: 'error', label: 'Errors only' }
    ]
  },
  microsoft_teams: {
    name: 'Microsoft Teams',
    description: 'Send notifications to Teams channels',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'bg-indigo-500',
    eventTypes: [
      { value: 'all', label: 'All events' },
      { value: 'document_processed', label: 'Document processed' },
      { value: 'research_complete', label: 'Research completed' },
      { value: 'conflict_detected', label: 'Conflicts detected' },
      { value: 'error', label: 'Errors only' }
    ]
  },
  webhook: {
    name: 'Custom Webhook',
    description: 'Send events to custom HTTP endpoints',
    icon: <Webhook className="h-6 w-6" />,
    color: 'bg-gray-500',
    eventTypes: [
      { value: 'all', label: 'All events' },
      { value: 'document_processed', label: 'Document processed' },
      { value: 'research_complete', label: 'Research completed' },
      { value: 'conflict_detected', label: 'Conflicts detected' },
      { value: 'error', label: 'Errors only' }
    ]
  }
};

interface IntegrationCardProps {
  integration: Integration;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(integration.webhook_url || '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(integration.webhook_events || []);
  const [isEnabled, setIsEnabled] = useState(integration.status === 'active');

  const updateMutation = useUpdateIntegration();
  const deleteMutation = useDeleteIntegration();
  const testWebhookMutation = useTestWebhook();

  const config = providerConfig[integration.provider];

  const getStatusBadge = () => {
    switch (integration.status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'expired':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{integration.status}</Badge>;
    }
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: integration.id,
      updates: {
        webhook_url: webhookUrl || null,
        webhook_events: selectedEvents,
        status: isEnabled && webhookUrl ? 'active' : 'pending'
      }
    });
    setShowSettings(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(integration.id);
    setShowDeleteConfirm(false);
  };

  const handleTestWebhook = () => {
    testWebhookMutation.mutate(integration.id);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color} text-white`}>
                {config.icon}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {integration.display_name || config.name}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integration.webhook_url && (
              <div className="text-sm">
                <span className="text-muted-foreground">Webhook:</span>{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {integration.webhook_url.substring(0, 50)}...
                </code>
              </div>
            )}
            
            {integration.webhook_events.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {integration.webhook_events.map(event => (
                  <Badge key={event} variant="outline" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            )}

            {integration.last_sync_at && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(integration.last_sync_at).toLocaleString()}
              </p>
            )}

            {integration.sync_error && (
              <p className="text-xs text-destructive">{integration.sync_error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
              {integration.webhook_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestWebhook}
                  disabled={testWebhookMutation.isPending}
                >
                  {testWebhookMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Test
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {config.name}</DialogTitle>
            <DialogDescription>
              Update your integration settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enabled</Label>
              <Switch 
                id="enabled" 
                checked={isEnabled} 
                onCheckedChange={setIsEnabled} 
              />
            </div>

            {(integration.provider === 'slack' || 
              integration.provider === 'microsoft_teams' || 
              integration.provider === 'webhook') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    placeholder="https://hooks.slack.com/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Types</Label>
                  <div className="space-y-2">
                    {config.eventTypes.map(event => (
                      <div key={event.value} className="flex items-center gap-2">
                        <Checkbox
                          id={event.value}
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        <Label htmlFor={event.value} className="font-normal">
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(integration.provider === 'google_drive' || integration.provider === 'gmail') && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  OAuth configuration for {config.name} requires additional setup.
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="#" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View setup guide
                  </a>
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {config.name} integration? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
