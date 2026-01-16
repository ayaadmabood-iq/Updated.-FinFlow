import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Cloud, 
  Mail, 
  MessageSquare, 
  Webhook,
  Loader2,
  Link2
} from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { ApiKeyManager } from './ApiKeyManager';
import { ActivityFeed } from './ActivityFeed';
import { useIntegrations, useCreateIntegration } from '@/hooks/useIntegrations';
import { IntegrationProvider } from '@/services/integrationService';

interface ConnectionsDashboardProps {
  projectId?: string;
}

const availableProviders: Array<{
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'inbound' | 'outbound';
  requiresOAuth: boolean;
}> = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Auto-import documents from watched folders',
    icon: <Cloud className="h-6 w-6" />,
    category: 'inbound',
    requiresOAuth: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Import attachments from labeled emails',
    icon: <Mail className="h-6 w-6" />,
    category: 'inbound',
    requiresOAuth: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: <MessageSquare className="h-6 w-6" />,
    category: 'outbound',
    requiresOAuth: false,
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Send notifications to Teams channels',
    icon: <MessageSquare className="h-6 w-6" />,
    category: 'outbound',
    requiresOAuth: false,
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Send events to any HTTP endpoint',
    icon: <Webhook className="h-6 w-6" />,
    category: 'outbound',
    requiresOAuth: false,
  },
];

const eventOptions = [
  { value: 'all', label: 'All events' },
  { value: 'document_processed', label: 'Document processed' },
  { value: 'research_complete', label: 'Research completed' },
  { value: 'conflict_detected', label: 'Conflicts detected' },
  { value: 'error', label: 'Errors only' },
];

export function ConnectionsDashboard({ projectId }: ConnectionsDashboardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | ''>('');
  const [displayName, setDisplayName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['all']);

  const { data: integrations, isLoading } = useIntegrations(projectId);
  const createMutation = useCreateIntegration();

  const handleAddIntegration = async () => {
    if (!selectedProvider) return;

    await createMutation.mutateAsync({
      provider: selectedProvider,
      project_id: projectId,
      display_name: displayName || undefined,
      webhook_url: webhookUrl || undefined,
      webhook_events: selectedEvents,
    });

    setShowAddDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProvider('');
    setDisplayName('');
    setWebhookUrl('');
    setSelectedEvents(['all']);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const selectedProviderConfig = availableProviders.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground">
            Connect external services to automate document ingestion and notifications
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Connect a new service to FineFlow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Service</Label>
                <Select 
                  value={selectedProvider} 
                  onValueChange={(v) => setSelectedProvider(v as IntegrationProvider)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          {provider.icon}
                          <span>{provider.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProviderConfig && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      placeholder={`My ${selectedProviderConfig.name}`}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  {selectedProviderConfig.requiresOAuth ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">OAuth Connection Required</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProviderConfig.name} requires OAuth authentication. 
                        After creating this integration, you'll be guided through the connection process.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="webhookUrl">Webhook URL</Label>
                        <Input
                          id="webhookUrl"
                          type="url"
                          placeholder={
                            selectedProvider === 'slack'
                              ? 'https://hooks.slack.com/services/...'
                              : selectedProvider === 'microsoft_teams'
                              ? 'https://outlook.office.com/webhook/...'
                              : 'https://your-endpoint.com/webhook'
                          }
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Events to Send</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {eventOptions.map(option => (
                            <div key={option.value} className="flex items-center gap-2">
                              <Checkbox
                                id={`event-${option.value}`}
                                checked={selectedEvents.includes(option.value)}
                                onCheckedChange={() => toggleEvent(option.value)}
                              />
                              <Label 
                                htmlFor={`event-${option.value}`} 
                                className="font-normal text-sm"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddIntegration} 
                disabled={!selectedProvider || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Integration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">
            <Link2 className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            API Keys
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : integrations && integrations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map(integration => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Integrations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect external services to automate your workflow
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Available Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Available Integrations</CardTitle>
              <CardDescription>
                Services you can connect to FineFlow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableProviders.map(provider => {
                  const isConnected = integrations?.some(i => i.provider === provider.id);
                  return (
                    <div
                      key={provider.id}
                      className={`p-4 border rounded-lg ${
                        isConnected ? 'bg-muted/50' : 'hover:border-primary cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isConnected) {
                          setSelectedProvider(provider.id);
                          setShowAddDialog(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          {provider.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{provider.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      {isConnected && (
                        <p className="text-xs text-green-600 mt-2">✓ Connected</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeyManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
