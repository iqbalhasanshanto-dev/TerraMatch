// Initialize map
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function overallScore(scores) {
  const values = Object.values(scores);
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
}

function renderDetails(site) {
  const detailsEl = document.getElementById('site-details');
  const score = overallScore(site.scores);
  const targetClass = site.target === 'mars' ? 'target-mars' : 'target-moon';

  let rows = '';
  for (const [key, value] of Object.entries(site.scores)) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    rows += `<div class="score-row"><span>${label}</span><span>${value}/10</span></div>`;
  }

  detailsEl.innerHTML = `
    <h3>${site.name} <span class="target-tag ${targetClass}">${site.target.toUpperCase()}</span></h3>
    <p>${site.description}</p>
    <div class="overall-score">Overall match: ${score} / 10</div>
    ${rows}
  `;
}

function renderSiteList() {
  const listEl = document.getElementById('site-list');
  listEl.innerHTML = '';

  SITES.forEach(site => {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.textContent = `${site.name} (${overallScore(site.scores)}/10)`;
    item.addEventListener('click', () => {
      renderDetails(site);
      map.setView([site.lat, site.lng], 5);
    });
    listEl.appendChild(item);
  });
}

function addMarkers() {
  SITES.forEach(site => {
    const marker = L.marker([site.lat, site.lng]).addTo(map);
    marker.bindPopup(`<b>${site.name}</b><br>Match: ${overallScore(site.scores)}/10`);
    marker.on('click', () => renderDetails(site));
  });
}

renderSiteList();
addMarkers();
