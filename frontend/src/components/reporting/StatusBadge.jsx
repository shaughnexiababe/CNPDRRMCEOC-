import React from 'react';
import { Badge } from '@/components/ui/badge';

const VARIANTS = {
  submitted: { label: 'Submitted', variant: 'default', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  draft: { label: 'Draft', variant: 'secondary', cls: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  returned: { label: 'Returned', variant: 'destructive', cls: 'bg-amber-600 hover:bg-amber-700 text-white' },
  missing: { label: 'Not started', variant: 'outline', cls: 'border-dashed border-slate-300 text-slate-500' },
  active: { label: 'Active', variant: 'default', cls: 'bg-blue-600 text-white' },
  closed: { label: 'Closed', variant: 'secondary', cls: 'bg-slate-300 text-slate-700' },
};

export default function StatusBadge({ status, className = '' }) {
  const cfg = VARIANTS[status] || { label: status || 'Unknown', variant: 'outline', cls: '' };
  return <Badge variant={cfg.variant} className={`${cfg.cls} ${className}`}>{cfg.label}</Badge>;
}
