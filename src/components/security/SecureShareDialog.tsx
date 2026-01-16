// Secure Share Dialog - Create password-protected, expiring share links

import { useState } from 'react';
import { useCreateShareLink, useShareLinks, useRevokeShareLink } from '@/hooks/useSecurity';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Share2, 
  Link, 
  Lock, 
  Clock, 
  Eye, 
  Download,
  Copy,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SecureShareDialogProps {
  resourceType: 'document' | 'project' | 'dataset' | 'report';
  resourceId: string;
  resourceName: string;
  trigger?: React.ReactNode;
}

export function SecureShareDialog({ 
  resourceType, 
  resourceId, 
  resourceName,
  trigger 
}: SecureShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>();
  const [maxViews, setMaxViews] = useState<number | undefined>();
  const [requireEmail, setRequireEmail] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState('');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [downloadEnabled, setDownloadEnabled] = useState(true);

  const { data: existingLinks = [], isLoading } = useShareLinks(resourceType, resourceId);
  const createLink = useCreateShareLink();
  const revokeLink = useRevokeShareLink();

  const handleCreate = () => {
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    createLink.mutate({
      resourceType,
      resourceId,
      password: password || undefined,
      expiresAt,
      maxViews,
      requireEmail,
      allowedEmails: allowedEmails ? allowedEmails.split(',').map(e => e.trim()) : undefined,
      watermarkEnabled,
      downloadEnabled,
    }, {
      onSuccess: () => {
        setPassword('');
        setExpiresInDays(undefined);
        setMaxViews(undefined);
        setAllowedEmails('');
      },
    });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const activeLinks = existingLinks.filter(l => l.isActive && !l.revokedAt);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Secure Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure Share: {resourceName}
          </DialogTitle>
          <DialogDescription>
            Create password-protected, self-destructing share links with watermarking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Link */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password Protection
                  </Label>
                  <Input
                    type="password"
                    placeholder="Optional password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expires In (days)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Never expires"
                    value={expiresInDays || ''}
                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Max Views
                  </Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={maxViews || ''}
                    onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Allowed Emails
                  </Label>
                  <Input
                    placeholder="email1@x.com, email2@x.com"
                    value={allowedEmails}
                    onChange={(e) => setAllowedEmails(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                  <Label className="text-sm">Require Email</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
                  <Label className="text-sm">Add Watermark</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={downloadEnabled} onCheckedChange={setDownloadEnabled} />
                  <Label className="text-sm">Allow Download</Label>
                </div>
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={createLink.isPending}
                className="w-full"
              >
                <Link className="h-4 w-4 mr-2" />
                {createLink.isPending ? 'Creating...' : 'Create Secure Link'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Links */}
          {activeLinks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Active Share Links</h4>
              {activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm truncate max-w-[200px]">
                        ...{link.accessToken.slice(-12)}
                      </span>
                      {link.hasPassword && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Protected
                        </Badge>
                      )}
                      {link.watermarkEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Watermark
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{link.viewCount} views</span>
                      {link.maxViews && <span>/ {link.maxViews} max</span>}
                      {link.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(link.expiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(link.accessToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeLink.mutate(link.id)}
                      disabled={revokeLink.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Security Features</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• All accesses are logged in the security audit trail</li>
                  <li>• Watermarks include viewer email and access timestamp</li>
                  <li>• Links can be revoked instantly at any time</li>
                  <li>• View limits prevent unauthorized redistribution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SecureShareDialog;
