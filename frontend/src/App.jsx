import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from '@/pages/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/Layout';
import StrategicDashboard from '@/pages/StrategicDashboard';
import GISMapPage from '@/pages/GISMapPage';
import OperationsCenter from '@/pages/OperationsCenter';
import RiskAnalytics from '@/pages/RiskAnalytics';
import HazardAlerts from '@/pages/HazardAlerts';
import FieldReports from '@/pages/FieldReports';
import Facilities from '@/pages/Facilities';
import DataLayers from '@/pages/DataLayers';
import BarangayAssessments from '@/pages/BarangayAssessments';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import UserManagement from '@/pages/UserManagement';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StrategicDashboard />} />
          <Route path="/map" element={<GISMapPage />} />
          <Route path="/operations" element={<OperationsCenter />} />
          <Route path="/analytics" element={<RiskAnalytics />} />
          <Route path="/alerts" element={<HazardAlerts />} />
          <Route path="/incidents" element={<FieldReports />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/layers" element={<DataLayers />} />
          <Route path="/assessments" element={<BarangayAssessments />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
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
  )
}

export default App
