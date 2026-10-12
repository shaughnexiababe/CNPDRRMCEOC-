import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, AlertCircle, RotateCcw, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ANNEXES, MODULES, cleanRows } from '@/lib/reporting/annexes';
import { validateReport, validateAnnex } from '@/lib/reporting/validation';
import { getOperation, getReport, getCasualties, createReport, saveDraft, submitReport, returnReport } from '@/lib/reporting/store';
import AnnexEditor from '@/components/reporting/AnnexEditor';
import StatusBadge from '@/components/reporting/StatusBadge';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';
import { unslug } from '@/lib/reporting/ids';

export default function ReportEntry() {
  const { opId, muniSlug, reportNo: rawReportNo } = useParams();
  const reportNo = Number(rawReportNo);
  const municipality = unslug(muniSlug);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isStaff, isMdrrmo, myMunicipality } = useReportingAccess();

  const [activeModule, setActiveModule] = useState('impact');
  const [activeAnnexNo, setActiveAnnexNo] = useState(1);
  const [annexes, setAnnexes] = useState({});
  const [na, setNa] = useState({});
  const [asOf, setAsOf] = useState('');
  const [notes, setNotes] = useState('');
  const [casualties, setCasualties] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: op } = useQuery({ queryKey: ['op', opId], queryFn: () => getOperation(opId) });
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', opId, municipality, reportNo],
    queryFn: () => getReport(opId, municipality, reportNo),
  });
  const { data: initialCasualties } = useQuery({
    queryKey: ['casualties', opId, report?.id],
    queryFn: () => getCasualties(opId, report.id),
    enabled: !!report?.id,
  });

  useEffect(() => {
    if (report) {
      setAnnexes(report.annexes || {});
      setNa(report.na || {});
      setAsOf(report.as_of || '');
      setNotes(report.notes || '');
    }
  }, [report]);

  useEffect(() => {
    if (initialCasualties) setCasualties(initialCasualties);
  }, [initialCasualties]);

  const canEdit = useMemo(() => {
    if (!report) return true;
    if (isStaff) return true;
    if (isMdrrmo && myMunicipality === municipality) {
      return report.status === 'draft' || report.status === 'returned';
    }
    return false;
  }, [report, isStaff, isMdrrmo, myMunicipality, municipality]);

  const issues = useMemo(() => {
    const full = { ...annexes, 3: casualties };
    return validateReport(full, na);
  }, [annexes, casualties, na]);

  const hasErrors = issues.some((i) => i.severity === 'error');

  const saveMutation = useMutation({
    mutationFn: async () => {
      let r = report;
      if (!r) r = await createReport(opId, municipality, reportNo, user);
      await saveDraft(opId, r.id, { annexes, na, as_of: asOf, notes, casualties });
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['report', opId, municipality, reportNo] });
      toast({ title: 'Draft saved' });
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let r = report;
      if (!r) r = await createReport(opId, municipality, reportNo, user);
      await saveDraft(opId, r.id, { annexes, na, as_of: asOf, notes, casualties });
      await submitReport(opId, r.id, { user, version: r.version });
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['report', opId, municipality, reportNo] });
      toast({ title: 'Report submitted', description: 'Report is now locked and sent to Provincial EOC.' });
    },
    onError: (e) => toast({ title: 'Submission failed', description: e.message, variant: 'destructive' }),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      await returnReport(opId, report.id, { user, reason: returnReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', opId, municipality, reportNo] });
      toast({ title: 'Report returned to municipality' });
    },
    onError: (e) => toast({ title: 'Action failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading form…</div>;

  const currentAnnex = ANNEXES.find((a) => a.no === activeAnnexNo) || ANNEXES[0];
  const currentRows = activeAnnexNo === 3 ? casualties : annexes[activeAnnexNo] || [];

  const handleRows = (rows) => {
    setDirty(true);
    if (activeAnnexNo === 3) setCasualties(rows);
    else setAnnexes({ ...annexes, [activeAnnexNo]: rows });
  };

  const handleNa = (val) => {
    setDirty(true);
    setNa({ ...na, [activeAnnexNo]: val });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to={`/reports/${opId}`} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Operation
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{municipality} — Report No. {reportNo}</h1>
            <StatusBadge status={report?.status || 'draft'} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{op?.name}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1.5" />Save draft
            </Button>
            <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || hasErrors}>
              <Send className="w-4 h-4 mr-1.5" />Submit report
            </Button>
          </div>
        )}
      </div>

      {report?.status === 'returned' && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-red-800">Returned for Correction</CardTitle></CardHeader>
          <CardContent className="text-xs text-red-900">
            <p><strong>Reason:</strong> {report.return_reason || 'Please review and update the figures.'}</p>
          </CardContent>
        </Card>
      )}

      {isStaff && report?.status === 'submitted' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">EOC Staff Action</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Reason for return…" className="text-xs h-16" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            <Button variant="outline" size="sm" onClick={() => returnMutation.mutate()} disabled={!returnReason.trim() || returnMutation.isPending}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Return to MDRRMO for correction
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {MODULES.map((m) => (
          <Button key={m.id} size="sm" variant={activeModule === m.id ? 'default' : 'ghost'} onClick={() => {
            setActiveModule(m.id);
            const first = ANNEXES.find((a) => a.module === m.id);
            if (first) setActiveAnnexNo(first.no);
          }}>
            {m.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          {ANNEXES.filter((a) => a.module === activeModule).map((a) => {
            const hasData = na[a.no] || (a.no === 3 ? casualties.length > 0 : (annexes[a.no] || []).length > 0);
            return (
              <button
                key={a.no}
                onClick={() => setActiveAnnexNo(a.no)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between ${
                  activeAnnexNo === a.no ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <span>Annex {a.no}: {a.title}</span>
                {hasData && <Check className="w-3.5 h-3.5 shrink-0 opacity-70" />}
              </button>
            );
          })}
        </div>

        <div className="md:col-span-3">
          <AnnexEditor
            annex={currentAnnex}
            rows={currentRows}
            onRows={handleRows}
            na={na[activeAnnexNo]}
            onNa={handleNa}
            readOnly={!canEdit}
            municipality={municipality}
            issues={issues.filter((i) => i.annex === activeAnnexNo)}
          />
        </div>
      </div>
    </div>
  );
}
