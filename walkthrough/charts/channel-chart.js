import { revenueByChannel } from '../data-store.js';

function renderFallback(canvas, reason) {
  const wrap = canvas.closest('.chart-wrap');
  if (!wrap) return;

  const total = revenueByChannel.reduce((sum, item) => sum + item.value, 0);
  const rows = revenueByChannel
    .map((item) => `<li><strong>${item.label}:</strong> ${Math.round((item.value / total) * 100)}%</li>`)
    .join('');

  wrap.innerHTML = `
    <div class="chart-fallback">
      <p class="badge info">Diagram utilgjengelig</p>
      <p class="muted">${reason}</p>
      <ul>${rows}</ul>
    </div>
  `;
}

export function initChannelChart() {
  const canvas = document.querySelector('#channelChart');
  if (!canvas) return;

  if (!window.Chart) {
    renderFallback(canvas, 'Chart.js ble ikke lastet. Viser kanalfordeling i tekst.');
    return;
  }

  if (!revenueByChannel.length) {
    renderFallback(canvas, 'Ingen datagrunnlag funnet.');
    return;
  }

  return new Chart(canvas, {
    type: 'pie',
    data: {
      labels: revenueByChannel.map((d) => d.label),
      datasets: [
        {
          label: 'Kanalandel',
          data: revenueByChannel.map((d) => d.value),
          backgroundColor: ['#76a9ff', '#39d98a', '#ffc36b']
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
      }
    }
  });
}
