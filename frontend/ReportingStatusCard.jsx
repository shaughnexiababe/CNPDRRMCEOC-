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

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />Situational Reporting</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!op ? (
          <p className="text-xs text-muted-foreground">No active operation. <Link className="underline" to="/reports">Open Situational Reports</Link></p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs"><span className="font-semibold truncate">{op.name}</span><span className="text-muted-foreground whitespace-nowrap">Report No. {N}</span></div>
            <div className="flex items-center gap-2"><Progress value={(c.compliance.submitted / c.compliance.total) * 100} className="h-2" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{c.compliance.submitted}/{c.compliance.total}</span></div>
            <div className="flex flex-wrap gap-1">{c.municipalities.map((r) => <span key={r.name} title={r.name}><StatusBadge status={r.state}>{r.name}</StatusBadge></span>)}</div>
            <p className="text-[11px] text-muted-foreground">{fmt(c.totals.displaced_persons_cur)} displaced · {fmt(c.totals.dead)} dead · {fmt(c.totals.missing)} missing</p>
            <Link className="text-xs underline" to={`/reports/${op.id}/consolidated`}>Open consolidated report</Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
