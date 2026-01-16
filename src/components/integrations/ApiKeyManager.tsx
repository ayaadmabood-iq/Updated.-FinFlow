import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Ban, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from '@/hooks/useIntegrations';
import { toast } from '@/hooks/use-toast';
import { ApiKey } from '@/services/integrationService';

interface ApiKeyManagerProps {
  projectId?: string;
}

export function ApiKeyManager({ projectId }: ApiKeyManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [ratePerMinute, setRatePerMinute] = useState(60);
  const [ratePerDay, setRatePerDay] = useState(1000);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

  const { data: apiKeys, isLoading } = useApiKeys(projectId);
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();
  const deleteMutation = useDeleteApiKey();

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name required',
        description: 'Please enter a name for your API key.',
      });
      return;
    }

    const result = await createMutation.mutateAsync({
      name: newKeyName,
      project_id: projectId,
      rate_limit_per_minute: ratePerMinute,
      rate_limit_per_day: ratePerDay,
    });

    setCreatedKey(result.secretKey);
    setShowCreateDialog(false);
    setShowSecretDialog(true);
    setNewKeyName('');
    setRatePerMinute(60);
    setRatePerDay(1000);
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      toast({
        title: 'Copied!',
        description: 'API key copied to clipboard.',
      });
    }
  };

  const handleRevoke = async () => {
    if (keyToRevoke) {
      await revokeMutation.mutateAsync(keyToRevoke.id);
      setKeyToRevoke(null);
    }
  };

  const handleDelete = async () => {
    if (keyToDelete) {
      await deleteMutation.mutateAsync(keyToDelete.id);
      setKeyToDelete(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to FineFlow
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for external integrations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rateMinute">Rate Limit (per minute)</Label>
                      <Input
                        id="rateMinute"
                        type="number"
                        value={ratePerMinute}
                        onChange={(e) => setRatePerMinute(parseInt(e.target.value) || 60)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rateDay">Rate Limit (per day)</Label>
                      <Input
                        id="rateDay"
                        type="number"
                        value={ratePerDay}
                        onChange={(e) => setRatePerDay(parseInt(e.target.value) || 1000)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8" role="status" aria-label="Loading API keys">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading API keys...</span>
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3" role="list" aria-label="API keys list">
                {apiKeys.map((key) => (
                  <div 
                    key={key.id} 
                    className="border rounded-lg p-4 space-y-3"
                    role="listitem"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {key.key_prefix}...
                        </code>
                      </div>
                      {key.is_active && !key.revoked_at ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Ban className="h-3 w-3 mr-1" aria-hidden="true" />
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{key.usage_count} requests • {key.rate_limit_per_minute}/min</p>
                      <p>Last used: {formatDate(key.last_used_at)}</p>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      {key.is_active && !key.revoked_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setKeyToRevoke(key)}
                          aria-label={`Revoke ${key.name}`}
                        >
                          <Ban className="h-4 w-4 mr-1" aria-hidden="true" />
                          Revoke
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKeyToDelete(key)}
                        aria-label={`Delete ${key.name}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table aria-label="API keys table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {key.key_prefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {key.is_active && !key.revoked_at ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Ban className="h-3 w-3 mr-1" aria-hidden="true" />
                              Revoked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{key.usage_count} requests</span>
                          <div className="text-xs text-muted-foreground">
                            {key.rate_limit_per_minute}/min, {key.rate_limit_per_day}/day
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                          {formatDate(key.last_used_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {key.is_active && !key.revoked_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setKeyToRevoke(key)}
                                aria-label={`Revoke ${key.name}`}
                              >
                                <Ban className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setKeyToDelete(key)}
                              aria-label={`Delete ${key.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8" role="status">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create an API key to start integrating with FineFlow
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>Quick reference for using the FineFlow API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Ingest a document via URL</h4>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "https://jkibxapuxnrbxpjefjdn.supabase.co/functions/v1/api-ingest" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/document.pdf", "project_id": "PROJECT_ID"}'`}
            </pre>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Upload a file</h4>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "https://jkibxapuxnrbxpjefjdn.supabase.co/functions/v1/api-ingest" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -F "file=@document.pdf" \\
  -F "project_id=PROJECT_ID"`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Secret Key Dialog */}
      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This is the only time you'll see this key. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={createdKey || ''}
                readOnly
                className="pr-20 font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Store this key securely. You won't be able to see it again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowSecretDialog(false); setCreatedKey(null); }}>
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{keyToRevoke?.name}"? 
              The key will no longer be able to authenticate requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{keyToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
