import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MUNICIPALITIES } from '@/lib/constants';
import { consolidate, fmt } from '@/lib/reporting/consolidate';
import { listOperations, listReports } from '@/lib/reporting/store';
import StatusBadge from '@/components/reporting/StatusBadge';

/** Dashboard card (EOC staff only): reporting progress of the active operation. */
export default function ReportingStatusCard() {
  const { data: ops = [] } = useQuery({ queryKey: ['operations'], queryFn: listOperations });
  const op = ops.find((o) => o.status === 'active');
  const { data: reports = [] } = useQuery({
    queryKey: ['reports', op?.id, 'all'], queryFn: () => listReports(op.id), enabled: !!op, refetchInterval: 60000,
  });
  const N = op?.current_report_no || 1;
  const c = useMemo(() => (op ? consolidate(reports, MUNICIPALITIES, N) : null), [op, reports, N]);

  if (!op || !c) {
    return (
      <Card className="hover:border-slate-300 transition-colors">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">NDRRMC Situational Reporting</CardTitle>
          <ClipboardCheck className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-3">No active operation created yet.</p>
          <Link to="/reports" className="text-xs text-blue-600 hover:underline font-medium">Open Reporting Console →</Link>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.round((c.compliance.submitted / c.compliance.total) * 100);

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{op.name} · Report No. {N}</CardTitle>
          <p className="text-xs text-slate-500">MDRRMO Submission Progress</p>
        </div>
        <ClipboardCheck className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">{c.compliance.submitted} of {c.compliance.total} Municipalities</span>
          <span className="font-semibold text-slate-600">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-500">
            {c.compliance.draft > 0 && `${c.compliance.draft} draft `}
            {c.compliance.missing > 0 && `${c.compliance.missing} not started`}
          </span>
          <Link to={`/reports/${op.id}/consolidated`} className="text-blue-600 hover:underline font-semibold">Consolidated Report →</Link>
        </div>
      </CardContent>
    </Card>
  );
}
