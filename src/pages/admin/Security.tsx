// Admin Security Dashboard - Centralized security monitoring and configuration

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SecurityAuditViewer } from '@/components/security/SecurityAuditViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PIIMaskingPanel } from '@/components/security/PIIMaskingPanel';
import { SessionManager } from '@/components/security/SessionManager';
import { Shield, Eye, Users, FileText } from 'lucide-react';

export default function AdminSecurity() {
  return (
    <DashboardLayout 
      title="Security Dashboard" 
      description="Monitor security events, manage PII, and control access"
    >
      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="pii" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            PII Scanner
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <SecurityAuditViewer />
        </TabsContent>

        <TabsContent value="pii">
          <PIIMaskingPanel />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionManager />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
