import { initIncomeChart } from './income-chart.js';
import { initOfferChart } from './offer-chart.js';
import { initChannelChart } from './channel-chart.js';

let chartInstances = [];

export function initAmbassadorCharts() {
  chartInstances = [initIncomeChart(), initOfferChart(), initChannelChart()].filter(Boolean);
  return chartInstances;
}

export function refreshAmbassadorCharts() {
  chartInstances.forEach((chart) => {
    if (typeof chart?.destroy === 'function') chart.destroy();
  });
  chartInstances = [];
  return initAmbassadorCharts();
}
