import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STYLES = {
  submitted: { label: 'Submitted', cls: 'bg-green-500/10 text-green-700 border-green-500/30' },
  draft: { label: 'Draft', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  returned: { label: 'Returned', cls: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  missing: { label: 'Not started', cls: 'bg-red-500/10 text-red-700 border-red-500/30' },
  stale: { label: 'Carried forward', cls: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  late: { label: 'Late', cls: 'bg-red-500/10 text-red-700 border-red-500/30' },
  active: { label: 'Active', cls: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  closed: { label: 'Closed', cls: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
};

export default function StatusBadge({ status, className, children }) {
  const s = STYLES[status] || { label: status, cls: '' };
  return <Badge variant="outline" className={cn('text-[10px] font-semibold', s.cls, className)}>{children || s.label}</Badge>;
}
