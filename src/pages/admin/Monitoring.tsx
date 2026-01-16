import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

export default function AdminMonitoring() {
  return (
    <AdminRoute>
      <DashboardLayout
        title="System Monitoring"
        description="Real-time system metrics, alerts, and performance monitoring"
      >
        <MonitoringDashboard />
      </DashboardLayout>
    </AdminRoute>
  );
}
