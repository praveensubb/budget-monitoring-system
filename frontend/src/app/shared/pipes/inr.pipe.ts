import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inr', standalone: true })
export class InrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
  }
}

@Pipe({ name: 'pct', standalone: true })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    return `${Number(value).toFixed(1)}%`;
  }
}

@Pipe({ name: 'dname', standalone: true })
export class DeptNamePipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '—';
    if (typeof value === 'string') return value;
    return value.name ?? '—';
  }
}
