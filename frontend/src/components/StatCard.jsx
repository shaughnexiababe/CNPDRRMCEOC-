import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, className }) {
  return (
    <Card className={cn("p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
      {trendValue && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
          {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-destructive" />}
          {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-accent" />}
          {(!trend || trend === 'neutral') && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={cn(
            "text-xs font-medium",
            trend === 'up' ? 'text-destructive' : trend === 'down' ? 'text-accent' : 'text-muted-foreground'
          )}>
            {trendValue}
          </span>
        </div>
      )}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full transition-transform group-hover:scale-110" />
    </Card>
  );
}
