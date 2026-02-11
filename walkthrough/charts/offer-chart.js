import { analyticsSeries } from '../data-store.js';

function renderFallback(canvas, reason) {
  const wrap = canvas.closest('.chart-wrap');
  if (!wrap) return;

  const totalOffers = analyticsSeries.reduce((sum, item) => sum + item.offerCount, 0);
  const avgOffers = analyticsSeries.length ? Math.round(totalOffers / analyticsSeries.length) : 0;
  wrap.innerHTML = `
    <div class="chart-fallback">
      <p class="badge info">Diagram utilgjengelig</p>
      <p class="muted">${reason}</p>
      <p><strong>Totalt antall tilbud:</strong> ${totalOffers}</p>
      <p><strong>Snitt per måned:</strong> ${avgOffers}</p>
    </div>
  `;
}

export function initOfferChart() {
  const canvas = document.querySelector('#offerChart');
  if (!canvas) return;

  if (!window.Chart) {
    renderFallback(canvas, 'Chart.js ble ikke lastet. Viser nøkkeltall i stedet.');
    return;
  }

  if (!analyticsSeries.length) {
    renderFallback(canvas, 'Ingen datagrunnlag funnet.');
    return;
  }

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: analyticsSeries.map((d) => d.month),
      datasets: [
        {
          label: 'Tilbud sendt',
          data: analyticsSeries.map((d) => d.offerCount),
          borderRadius: 8,
          backgroundColor: '#76a9ff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
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
