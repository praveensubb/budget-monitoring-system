import { Alert, Budget } from '../core/models/models';

export function levelBadge(level?: string): string {
  switch (level) {
    case 'GREEN': return 'badge-green';
    case 'YELLOW': return 'badge-yellow';
    case 'ORANGE': return 'badge-orange';
    case 'RED': return 'badge-red';
    default: return 'badge-gray';
  }
}

export function levelBar(level?: string): string {
  switch (level) {
    case 'GREEN': return 'bar-green';
    case 'YELLOW': return 'bar-yellow';
    case 'ORANGE': return 'bar-orange';
    case 'RED': return 'bar-red';
    default: return 'bar-green';
  }
}

export function severityBadge(severity?: string): string {
  switch (severity) {
    case 'CRITICAL': return 'badge-red';
    case 'HIGH': return 'badge-orange';
    case 'MEDIUM': return 'badge-yellow';
    case 'LOW': return 'badge-blue';
    default: return 'badge-gray';
  }
}

export function severityDot(severity?: string): string {
  switch (severity) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ea580c';
    case 'MEDIUM': return '#d97706';
    case 'LOW': return '#2563eb';
    default: return '#94a3b8';
  }
}

export function statusBadge(status?: string): string {
  switch (status) {
    case 'ACTIVE': case 'RECORDED': case 'OPEN': case 'RESOLVED': return 'badge-green';
    case 'VERIFIED': return 'badge-cyan';
    case 'DRAFT': return 'badge-yellow';
    case 'CLOSED': case 'CANCELLED': case 'INACTIVE': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function alertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    UTILIZATION_WARNING: 'Utilization Warning',
    HIGH_RISK_UTILIZATION: 'High Risk Utilization',
    CRITICAL_UTILIZATION: 'Critical / Over Budget',
    LARGE_TRANSACTION: 'Large Transaction',
    SUSPICIOUS_SPENDING: 'Suspicious Spending',
    UNDER_UTILIZATION: 'Under-utilization',
    OVER_BUDGET: 'Over Budget',
  };
  return map[type] ?? type;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Administrator',
    FINANCE_OFFICER: 'Finance Officer',
    DEPARTMENT_HEAD: 'Department Head',
  };
  return map[role] ?? role;
}

/** Download a 2D array as CSV file. */
export function exportCsv(filename: string, headers: string[], rows: any[][]) {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Trigger browser print (used for PDF export via Save-as-PDF). */
export function exportPrint(title: string) {
  window.print();
}
