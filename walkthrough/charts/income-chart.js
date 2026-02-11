import { analyticsSeries } from '../data-store.js';

function renderFallback(canvas, reason) {
  const wrap = canvas.closest('.chart-wrap');
  if (!wrap) return;

  const totalRevenue = analyticsSeries.reduce((sum, item) => sum + item.revenue, 0);
  const bestMonth = analyticsSeries.reduce((best, item) => (item.revenue > best.revenue ? item : best), analyticsSeries[0]);
  wrap.innerHTML = `
    <div class="chart-fallback">
      <p class="badge info">Diagram utilgjengelig</p>
      <p class="muted">${reason}</p>
      <p><strong>Totalt siste 6 måneder:</strong> ${new Intl.NumberFormat('nb-NO').format(totalRevenue)} kr</p>
      <p><strong>Beste måned:</strong> ${bestMonth.month} (${new Intl.NumberFormat('nb-NO').format(bestMonth.revenue)} kr)</p>
    </div>
  `;
}

export function initIncomeChart() {
  const canvas = document.querySelector('#incomeChart');
  if (!canvas) return;

  if (!window.Chart) {
    renderFallback(canvas, 'Chart.js ble ikke lastet. Viser nøkkeltall i stedet.');
    return;
  }

  if (!analyticsSeries.length) {
    renderFallback(canvas, 'Ingen datagrunnlag funnet.');
    return;
  }

  const months = analyticsSeries.map((d) => d.month);
  const revenues = analyticsSeries.map((d) => d.revenue);

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Inntekt',
          data: revenues,
          borderColor: '#2956f2',
          backgroundColor: 'rgba(41, 86, 242, 0.16)',
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#eaf2ff'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#d0def8' },
          grid: { color: 'rgba(208, 222, 248, 0.18)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#d0def8' },
          grid: { color: 'rgba(208, 222, 248, 0.18)' }
        }
      }
    }
  });
}
