import { Injectable } from '@angular/core';
import Chart from 'chart.js/auto';

@Injectable({ providedIn: 'root' })
export class ChartService {
  private charts = new Map<string, Chart>();

  create(canvasId: string, config: any): Chart | null {
    const existing = this.charts.get(canvasId);
    if (existing) existing.destroy();
    const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!el) return null;
    const chart = new Chart(el, config);
    this.charts.set(canvasId, chart);
    return chart;
  }

  destroyAll() {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }
}
