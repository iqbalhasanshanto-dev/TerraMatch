// Initialize map
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 12
}).addTo(map);

let currentFilter = 'all';
let markers = {}; // id -> Leaflet marker

function overallScore(scores) {
  const values = Object.values(scores);
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
}

function markerColor(target) {
  return target === 'mars' ? '#b5442e' : '#555555';
}

function makeIcon(target) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 16px; height: 16px; border-radius: 50%;
      background: ${markerColor(target)};
      border: 2px solid white;
      box-shadow: 0 0 3px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
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

  highlightSelected(site.id);
}

function highlightSelected(id) {
  document.querySelectorAll('.site-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
}

function visibleSites() {
  if (currentFilter === 'all') return SITES;
  return SITES.filter(s => s.target === currentFilter);
}

function renderSiteList() {
  const listEl = document.getElementById('site-list');
  listEl.innerHTML = '';

  const sorted = [...visibleSites()].sort(
    (a, b) => overallScore(b.scores) - overallScore(a.scores)
  );

  sorted.forEach(site => {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.dataset.id = site.id;
    const dotClass = site.target === 'mars' ? 'dot-mars' : 'dot-moon';
    item.innerHTML = `
      <span><span class="badge-dot ${dotClass}"></span>${site.name}</span>
      <span>${overallScore(site.scores)}/10</span>
    `;
    item.addEventListener('click', () => {
      renderDetails(site);
      map.setView([site.lat, site.lng], 5);
      markers[site.id].openPopup();
    });
    listEl.appendChild(item);
  });
}

function addMarkers() {
  SITES.forEach(site => {
    const marker = L.marker([site.lat, site.lng], { icon: makeIcon(site.target) }).addTo(map);
    marker.bindPopup(`<b>${site.name}</b><br>Match: ${overallScore(site.scores)}/10`);
    marker.on('click', () => renderDetails(site));
    markers[site.id] = marker;
  });
}

function applyFilter(target) {
  currentFilter = target;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === target);
  });

  Object.entries(markers).forEach(([id, marker]) => {
    const site = SITES.find(s => s.id === id);
    const visible = target === 'all' || site.target === target;
    if (visible) {
      marker.addTo(map);
    } else {
      map.removeLayer(marker);
    }
  });

  renderSiteList();
}

function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.target));
  });
}

addMarkers();
renderSiteList();
setupFilterButtons();