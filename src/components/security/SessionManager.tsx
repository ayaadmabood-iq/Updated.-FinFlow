// Session Manager - Multi-device session control and security

import { useUserSessions, useRevokeSession, useRevokeAllSessions, type UserSession } from '@/hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe,
  LogOut,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

function getDeviceIcon(userAgent?: string) {
  if (!userAgent) return Globe;
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
  if (ua.includes('ipad') || ua.includes('tablet')) return Tablet;
  return Monitor;
}

function parseDeviceInfo(userAgent?: string): { browser: string; os: string } {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';

  // Browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

  return { browser, os };
}

export function SessionManager() {
  const { data: sessions = [], isLoading } = useUserSessions();
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const activeSessions = sessions.filter(s => s.isActive);
  const currentSession = sessions.find(s => s.isCurrent);
  const otherSessions = activeSessions.filter(s => !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Session Security
          </CardTitle>
          <CardDescription>
            Manage your active sessions and secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{activeSessions.length}</p>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
            </div>
            {otherSessions.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => revokeAll.mutate()}
                disabled={revokeAll.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All Other Devices
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-success/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionCard session={currentSession} isCurrent />
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : otherSessions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Other Active Sessions
            </CardTitle>
            <CardDescription>
              These devices are currently signed in to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherSessions.map((session) => (
              <SessionCard 
                key={session.id} 
                session={session}
                onRevoke={() => revokeSession.mutate(session.id)}
                isRevoking={revokeSession.isPending}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No other active sessions</p>
              <p className="text-sm">You're only signed in on this device</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Sign out of sessions you don't recognize</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Enable two-factor authentication for extra security</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Use unique, strong passwords for your account</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Review session activity regularly</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface SessionCardProps {
  session: UserSession;
  isCurrent?: boolean;
  onRevoke?: () => void;
  isRevoking?: boolean;
}

function SessionCard({ session, isCurrent, onRevoke, isRevoking }: SessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.userAgent);
  const { browser, os } = parseDeviceInfo(session.userAgent);

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${isCurrent ? 'border-success/50 bg-success/5' : 'border-border'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isCurrent ? 'bg-success/10' : 'bg-muted'}`}>
          <DeviceIcon className={`h-5 w-5 ${isCurrent ? 'text-success' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{browser} on {os}</p>
            {isCurrent && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                This device
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {session.ipAddress && (
              <span className="font-mono">{session.ipAddress}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Active {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Created {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      {!isCurrent && onRevoke && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRevoke}
          disabled={isRevoking}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      )}
    </div>
  );
}

export default SessionManager;
