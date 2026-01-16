import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import Pricing from "./pages/Pricing";
import ProjectData from "./pages/ProjectData";
import Models from "./pages/Models";
import Templates from "./pages/Templates";
import Analytics from "./pages/Analytics";
import Training from "./pages/Training";
import TrainingDetail from "./pages/TrainingDetail";
import Datasets from "./pages/Datasets";
import DatasetDetail from "./pages/DatasetDetail";
import TeamSettings from "./pages/settings/TeamSettings";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMetrics from "./pages/admin/Metrics";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import LearnLLM from "./pages/LearnLLM";
import AdminInfrastructure from "./pages/admin/Infrastructure";
import AdminMonitoring from "./pages/admin/Monitoring";
import ProjectBudget from "./pages/ProjectBudget";
import ProjectStudio from "./pages/ProjectStudio";
import ProjectKnowledgeGraph from "./pages/ProjectKnowledgeGraph";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                {/* Public Learn Page - accessible without login */}
                <Route path="/learn" element={<LearnLLM />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <ProjectDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id/budget"
                  element={
                    <ProtectedRoute>
                      <ProjectBudget />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id/data"
                  element={
                    <ProtectedRoute>
                      <ProjectData />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id/studio"
                  element={
                    <ProtectedRoute>
                      <ProjectStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id/knowledge-graph"
                  element={
                    <ProtectedRoute>
                      <ProjectKnowledgeGraph />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/models"
                  element={
                    <ProtectedRoute>
                      <Models />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/training"
                  element={
                    <ProtectedRoute>
                      <Training />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/training/:id"
                  element={
                    <ProtectedRoute>
                      <TrainingDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datasets"
                  element={
                    <ProtectedRoute>
                      <Datasets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datasets/:id"
                  element={
                    <ProtectedRoute>
                      <DatasetDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <ProtectedRoute>
                      <Templates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-log"
                  element={
                    <ProtectedRoute>
                      <AuditLog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/team"
                  element={
                    <ProtectedRoute>
                      <TeamSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pricing"
                  element={
                    <ProtectedRoute>
                      <Pricing />
                    </ProtectedRoute>
                  }
                />
                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/metrics"
                  element={
                    <ProtectedRoute>
                      <AdminMetrics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute>
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/infrastructure"
                  element={
                    <ProtectedRoute>
                      <AdminInfrastructure />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/monitoring"
                  element={
                    <ProtectedRoute>
                      <AdminMonitoring />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
