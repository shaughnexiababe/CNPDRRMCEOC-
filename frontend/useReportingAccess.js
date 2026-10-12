import { useAuth } from '@/lib/AuthContext';
import { MUNICIPALITIES } from '@/lib/constants';

/**
 * Who is this user in the reporting module?
 *  - staff   (admin / eoc_personnel): sees everything, can enter data on behalf of a municipality
 *  - mdrrmo  : one municipality only (user.municipality, assigned by an admin at invite time)
 */
export function useReportingAccess() {
  const { user } = useAuth();
  const role = user?.role || 'citizen';
  const isStaff = role === 'admin' || role === 'eoc_personnel';
  const isMdrrmo = role === 'mdrrmo';
  const myMunicipality = isMdrrmo && MUNICIPALITIES.includes(user?.municipality) ? user.municipality : null;
  return { user, role, isStaff, isMdrrmo, myMunicipality, canReport: isStaff || (isMdrrmo && !!myMunicipality) };
}
