import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

const StrategicDashboard = lazy(() => import('@/pages/StrategicDashboard'));
const GISMapPage = lazy(() => import('@/pages/GISMapPage'));
const OperationsCenter = lazy(() => import('@/pages/OperationsCenter'));
const RiskAnalytics = lazy(() => import('@/pages/RiskAnalytics'));
const HazardAlerts = lazy(() => import('@/pages/HazardAlerts'));
const FieldReports = lazy(() => import('@/pages/FieldReports'));
const Facilities = lazy(() => import('@/pages/Facilities'));
const DataLayers = lazy(() => import('@/pages/DataLayers'));
const BarangayAssessments = lazy(() => import('@/pages/BarangayAssessments'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const SituationalReports = lazy(() => import('@/pages/reports/SituationalReports'));
const OperationDetail = lazy(() => import('@/pages/reports/OperationDetail'));
const ReportEntry = lazy(() => import('@/pages/reports/ReportEntry'));
const ConsolidatedReport = lazy(() => import('@/pages/reports/ConsolidatedReport'));
const ReportPrint = lazy(() => import('@/pages/reports/ReportPrint'));
const PageNotFound = lazy(() => import('@/pages/PageNotFound'));

const FallbackSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/50">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <FallbackSpinner />;
  }

  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" />} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<StrategicDashboard />} />
            <Route path="/map" element={<GISMapPage />} />
            <Route path="/alerts" element={<HazardAlerts />} />
            <Route path="/incidents" element={<FieldReports />} />
          </Route>

          {/* NDRRMC situational reporting */}
          <Route element={<ProtectedRoute roles={['admin', 'eoc_personnel', 'mdrrmo']} unauthenticatedElement={<Navigate to="/login" />} />}>
            <Route element={<AppLayout />}>
              <Route path="/reports" element={<SituationalReports />} />
              <Route path="/reports/:opId" element={<OperationDetail />} />
              <Route path="/reports/:opId/consolidated" element={<ConsolidatedReport />} />
              <Route path="/reports/:opId/:muniSlug/:reportNo" element={<ReportEntry />} />
            </Route>
            <Route path="/reports/:opId/print/consolidated" element={<ReportPrint />} />
            <Route path="/reports/:opId/print/:muniSlug/:reportNo" element={<ReportPrint />} />
          </Route>

          {/* EOC staff & admin only */}
          <Route element={<ProtectedRoute roles={['admin', 'eoc_personnel']} unauthenticatedElement={<Navigate to="/login" />} />}>
            <Route element={<AppLayout />}>
              <Route path="/operations" element={<OperationsCenter />} />
              <Route path="/analytics" element={<RiskAnalytics />} />
              <Route path="/facilities" element={<Facilities />} />
              <Route path="/assessments" element={<BarangayAssessments />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute roles={['admin']} unauthenticatedElement={<Navigate to="/login" />} />}>
            <Route element={<AppLayout />}>
              <Route path="/layers" element={<DataLayers />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
