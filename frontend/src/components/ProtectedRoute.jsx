import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const Forbidden = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
    <h2 className="text-xl font-bold">Access restricted</h2>
    <p className="text-sm text-muted-foreground max-w-sm">
      Your account role does not have permission to view this page. If you believe this is an error,
      contact the PDRRM Office administrator.
    </p>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, roles }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Role-based access control at the ROUTE level:
  if (roles && roles.length > 0) {
    const effectiveRole = user?.role || 'citizen';
    if (!roles.includes(effectiveRole)) {
      return <Forbidden />;
    }
  }

  return <Outlet />;
}
