import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const exposureColors = {
  none: 'text-gray-500',
  low: 'text-green-600',
  moderate: 'text-yellow-600',
  high: 'text-orange-600',
  very_high: 'text-red-600',
};

export default function AssessmentsPanel() {
  const { data: assessments = [] } = useQuery({
    queryKey: ['barangay_assessments'],
    queryFn: () => cnpdrrmceoc.entities.BarangayAssessment.list('-created_date', 5),
  });

  const highRiskCount = assessments.filter(a =>
    a.flood_exposure === 'high' || a.flood_exposure === 'very_high' ||
    a.landslide_exposure === 'high' || a.landslide_exposure === 'very_high' ||
    a.storm_surge_exposure === 'high' || a.storm_surge_exposure === 'very_high'
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Barangay Assessments</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {highRiskCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
                {highRiskCount} high risk
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" asChild>
              <Link to="/assessments">View All <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {assessments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No assessments submitted yet.</p>
            <Button variant="outline" size="sm" className="mt-3 text-xs" asChild>
              <Link to="/assessments">Submit First Assessment</Link>
            </Button>
          </div>
        ) : (
          assessments.map(a => (
            <div key={a.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{a.barangay}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {a.municipality}
                </div>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span>F: <span className={`font-medium ${exposureColors[a.flood_exposure] || ''}`}>{(a.flood_exposure || 'none').replace('_', ' ')}</span></span>
                  <span>L: <span className={`font-medium ${exposureColors[a.landslide_exposure] || ''}`}>{(a.landslide_exposure || 'none').replace('_', ' ')}</span></span>
                  <span>SS: <span className={`font-medium ${exposureColors[a.storm_surge_exposure] || ''}`}>{(a.storm_surge_exposure || 'none').replace('_', ' ')}</span></span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(a.created_date), 'MMM d')}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
