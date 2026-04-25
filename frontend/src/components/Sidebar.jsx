import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Map, LayoutDashboard, AlertTriangle, FileText,
  Building2, Layers, Shield, ChevronLeft, ChevronRight,
  Activity, Radio, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Strategic Overview' },
  { path: '/map', icon: Map, label: 'GIS Map' },
  { path: '/operations', icon: Radio, label: 'Operations Center' },
  { path: '/analytics', icon: Activity, label: 'Risk Analytics' },
  { path: '/alerts', icon: AlertTriangle, label: 'Hazard Alerts' },
  { path: '/incidents', icon: FileText, label: 'Field Reports' },
  { path: '/facilities', icon: Building2, label: 'Facilities' },
  { path: '/layers', icon: Layers, label: 'Data Layers' },
  { path: '/assessments', icon: ClipboardList, label: 'Barangay Assessments' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-out",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-16" : "w-60"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="PDRRMO Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-sidebar-primary-foreground leading-tight">CN-PDRRMO</p>
              <p className="text-[9px] text-sidebar-foreground/60 truncate">Province of CamNorte</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const link = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
