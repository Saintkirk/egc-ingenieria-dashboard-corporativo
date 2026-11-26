import { listarSitios, ESTADOS, reagendarSitioLocal } from './store.js';
import { esc } from './ui.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let mapa;
let capa;
let seleccionado;

const cargarLeaflet = () => new Promise((resolve, reject) => {
  if (window.L) return resolve(window.L);
  if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
    const script = document.createElement('script'); script.src = LEAFLET_JS; script.onload = () => resolve(window.L); script.onerror = reject; document.head.append(script);
  } else {
    document.querySelector(`script[src="${LEAFLET_JS}"]`).addEventListener('load', () => resolve(window.L), { once: true });
  }
});

const fechaLegible = value => value ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)) : 'Sin programar';
const wmo = code => ({ 0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna intensa', 61: 'Lluvia', 63: 'Lluvia', 65: 'Lluvia intensa', 71: 'Nieve', 80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos intensos', 95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta' }[code] ?? 'Condición variable');
const aptitud = (probabilidad = 0, code = 0, viento = 0) => {
  const lluvia = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
  if (lluvia || probabilidad >= 55 || viento >= 45) return { clase: 'weather-bad', label: 'No recomendable', texto: 'Reagendar visita: lluvia, tormenta o viento elevado.' };
  if (probabilidad >= 30 || [2, 3, 45, 48].includes(code) || viento >= 30) return { clase: 'weather-warn', label: 'Precaución', texto: 'Revisar condiciones antes de movilizar al equipo.' };
  return { clase: 'weather-good', label: 'Óptimo', texto: 'Condiciones favorables para visita en terreno.' };
};
const colorEstado = estado => `status-${Math.min(Number(estado) + 1, 10)}`;

async function pronostico(site) {
  if (!site.latitud || !site.longitud) throw new Error('El sitio no tiene coordenadas registradas.');
  const params = new URLSearchParams({ latitude: site.latitud, longitude: site.longitud, daily: 'weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,temperature_2m_max,temperature_2m_min', timezone: 'America/Santiago', forecast_days: '16' });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('No fue posible consultar el pronóstico.');
  const data = await response.json();
  const index = data.daily?.time?.indexOf(site.visitaProgramada);
  if (index === undefined || index < 0) throw new Error(`El pronóstico está disponible hasta ${data.daily?.time?.at(-1) ?? 'la fecha actual'}.`);
  return { fecha: site.visitaProgramada, code: data.daily.weather_code[index], probabilidad: data.daily.precipitation_probability_max[index], lluvia: data.daily.precipitation_sum[index], viento: data.daily.wind_speed_10m_max[index], max: data.daily.temperature_2m_max[index], min: data.daily.temperature_2m_min[index] };
}

const markerHtml = site => `<span class="geo-marker ${colorEstado(site.estado)}" aria-label="${esc(site.id)}"></span>`;
const detalleBase = site => `<div class="geo-detail"><div class="geo-detail-head"><div><strong>${esc(site.id)} · ${esc(site.nombre)}</strong><small>${esc(site.comuna)}</small></div><span class="chip s${Math.min(site.estado + 1, 8)}">${esc(ESTADOS[site.estado])}</span></div><div class="geo-facts"><span><b>Coordenadas</b>${Number(site.latitud).toFixed(5)}, ${Number(site.longitud).toFixed(5)}</span><span><b>Elevación</b>${site.elevacion ?? '—'} m s. n. m.</span><span><b>Visita agendada</b>${fechaLegible(site.visitaProgramada)}</span></div><div class="geo-weather" data-weather><span class="weather-loading">Consultando pronóstico para la visita…</span></div><button class="btn g geo-reschedule" type="button">Reagendar visita</button></div>`;

async function seleccionar(site, panel, marker) {
  seleccionado = site;
  document.querySelectorAll('.geo-marker').forEach(el => el.classList.remove('is-selected'));
  marker?.getElement()?.classList.add('is-selected');
  panel.innerHTML = detalleBase(site);
  const weatherEl = panel.querySelector('[data-weather]');
  try {
    const forecast = await pronostico(site); const status = aptitud(forecast.probabilidad, forecast.code, forecast.viento);
    weatherEl.innerHTML = `<div class="weather-status ${status.clase}"><strong>${status.label}</strong><span>${esc(status.texto)}</span></div><div class="weather-grid"><span><b>${wmo(forecast.code)}</b>Condición</span><span><b>${forecast.probabilidad ?? 0}%</b>Prob. lluvia</span><span><b>${forecast.min}° / ${forecast.max}°</b>Temperatura</span><span><b>${forecast.viento} km/h</b>Viento máximo</span></div>`;
  } catch (error) { weatherEl.innerHTML = `<div class="weather-status weather-warn"><strong>Pronóstico no disponible</strong><span>${esc(error.message)}</span></div>`; }
  panel.querySelector('.geo-reschedule')?.addEventListener('click', async () => {
    const nueva = window.prompt('Nueva fecha de visita (AAAA-MM-DD):', site.visitaProgramada || '');
    if (!nueva || !/^\d{4}-\d{2}-\d{2}$/.test(nueva)) return;
    let persistencia = 'local';
    try {
      const response = await fetch(`/api/demo/sites/${encodeURIComponent(site.id)}/reschedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha: nueva }) });
      const result = await response.json();
      if (response.ok && result.ok) {
        Object.assign(site, result.sitio);
        persistencia = 'servidor';
      } else {
        Object.assign(site, reagendarSitioLocal(site.id, nueva));
      }
    } catch {
      Object.assign(site, reagendarSitioLocal(site.id, nueva));
    }
    window.alert(persistencia === 'servidor'
      ? 'Visita reagendada y persistida en el servidor.'
      : 'Visita reagendada en esta demo y guardada localmente en este navegador.');
    await seleccionar(site, panel, marker);
  });
}

export async function initMapFlow() {
  const el = document.getElementById('sites-map'); const panel = document.getElementById('geo-detail-panel');
  if (!el || !panel) return;
  const sites = listarSitios().filter(site => Number.isFinite(Number(site.latitud)) && Number.isFinite(Number(site.longitud)) && Number(site.latitud) !== 0);
  if (!sites.length) { el.innerHTML = '<div class="map-empty">No hay sitios con coordenadas registradas.</div>'; return; }
  try {
    const L = await cargarLeaflet(); mapa = L.map(el, { scrollWheelZoom: false }).setView([-33.2, -70.75], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
    capa = L.featureGroup().addTo(mapa);
    sites.forEach(site => { const marker = L.marker([site.latitud, site.longitud], { icon: L.divIcon({ className: 'geo-icon', html: markerHtml(site), iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(capa); marker.on('click', () => seleccionar(site, panel, marker)); });
    mapa.fitBounds(capa.getBounds().pad(0.18));
    seleccionar(sites[0], panel, capa.getLayers()[0]);
  } catch { el.innerHTML = '<div class="map-empty">No fue posible cargar el mapa. Revisa la conexión y vuelve a intentar.</div>'; }
}
