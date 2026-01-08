/**
 * NWA Grid Dashboard - Weather & Traffic Management System
 * Vaporwave Weather Channel Style
 * 
 * Rework of Cameron Wilson's airtrak.me Site
 * by Maximiliano Garcia
 * GitHub: https://github.com/maxgarcia642/NWAeroGridashboard
 */

// ================================================
// Configuration
// ================================================
const CONFIG = {
    NWS_STATION: 'KASG',
    NWS_API_BASE: 'https://api.weather.gov',
    
    // iDriveArkansas API endpoints
    IDRIVE_EVENTS_URL: 'https://www.idrivearkansas.com/api/events',
    IDRIVE_CAMERAS_URL: 'https://www.idrivearkansas.com/api/cameras',
    
    HOME_LOCATION: { lat: 36.1867, lon: -94.1288 },
    
    REFRESH_WEATHER: 5 * 60 * 1000,
    REFRESH_INCIDENTS: 30 * 1000,
    REFRESH_CAMERAS: 10 * 60 * 1000,
};

// ================================================
// State
// ================================================
const state = {
    ignoredIds: JSON.parse(localStorage.getItem('ignoredIds') || '[]'),
    cameras: [],
    autoPlaySound: false,
    lastUpdate: null,
    refreshCountdown: 300,
    previousIncidentCount: 0
};

// ================================================
// Utilities
// ================================================
function padZero(num) { return num < 10 ? '0' + num : num; }

function degToRad(deg) { return deg * (Math.PI / 180); }

function getDistance(loc1, loc2) {
    const R = 3959;
    const dLat = degToRad(loc2.lat - loc1.lat);
    const dLon = degToRad(loc2.lon - loc1.lon);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(degToRad(loc1.lat)) * Math.cos(degToRad(loc2.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getDewpointClass(dp) {
    if (dp < 55) return 'dewpoint-comfortable';
    if (dp < 65) return 'dewpoint-sticky';
    if (dp < 70) return 'dewpoint-oppressive';
    return 'dewpoint-miserable';
}

function degreesToCompass(deg) {
    if (deg === null || deg === undefined) return '--';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

function calculateHeatIndex(T, R) {
    if (T < 80 || R === null) return null;
    return Math.round(-42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R 
           - 0.00683783*T*T - 0.05481717*R*R + 0.00122874*T*T*R 
           + 0.00085282*T*R*R - 0.00000199*T*T*R*R);
}

function calculateWindChill(T, W) {
    if (T > 50 || W < 3) return null;
    return Math.round(35.74 + 0.6215*T - 35.75*Math.pow(W, 0.16) + 0.4275*T*Math.pow(W, 0.16));
}

function findNearestCamera(lat, lon) {
    if (!state.cameras.length) return null;
    let minDist = Infinity, nearest = null;
    for (const cam of state.cameras) {
        const cLat = cam.latitude || cam.lat;
        const cLon = cam.longitude || cam.lon || cam.lng;
        if (cLat && cLon) {
            const d = getDistance({lat, lon}, {lat: cLat, lon: cLon});
            if (d < minDist) { minDist = d; nearest = {...cam, distance: d}; }
        }
    }
    return nearest;
}

// ================================================
// Clock
// ================================================
function updateCentralClock() {
    const now = new Date();
    const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    let h = ct.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    document.getElementById('centralClock').textContent = 
        `${h}:${padZero(ct.getMinutes())}:${padZero(ct.getSeconds())} ${ampm} CT`;
}

function updateRefreshTimer() {
    state.refreshCountdown--;
    if (state.refreshCountdown <= 0) { state.refreshCountdown = 300; }
    const m = Math.floor(state.refreshCountdown / 60);
    document.getElementById('refreshTimer').textContent = `${m}:${padZero(state.refreshCountdown % 60)}`;
}

// ================================================
// Weather
// ================================================
async function getWeather() {
    try {
        const res = await fetch(`${CONFIG.NWS_API_BASE}/stations/${CONFIG.NWS_STATION}/observations/latest`, {
            headers: { 'User-Agent': 'NWA Grid Dashboard', 'Accept': 'application/geo+json' }
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        const p = data.properties;
        
        const tempC = p.temperature?.value;
        const dewC = p.dewpoint?.value;
        const windKmh = p.windSpeed?.value;
        const gustKmh = p.windGust?.value;
        const windDir = p.windDirection?.value;
        const hum = p.relativeHumidity?.value;
        const visM = p.visibility?.value;
        const pressPa = p.barometricPressure?.value;
        const cond = p.textDescription || 'Unknown';
        
        const tempF = tempC != null ? Math.round(tempC * 9/5 + 32) : '--';
        const dewF = dewC != null ? Math.round(dewC * 9/5 + 32) : '--';
        const windMph = windKmh != null ? Math.round(windKmh * 0.621371) : '--';
        const gustMph = gustKmh != null ? Math.round(gustKmh * 0.621371) : '--';
        const humPct = hum != null ? Math.round(hum) : '--';
        const visMi = visM != null ? Math.round(visM / 1609.34 * 10) / 10 : '--';
        const pressIn = pressPa != null ? (pressPa / 3386.39).toFixed(2) : '--';
        
        let dewDep = '--';
        if (typeof tempF === 'number' && typeof dewF === 'number') dewDep = (tempF - dewF) + '°F';
        
        let feelsLike = '';
        if (typeof tempF === 'number' && typeof humPct === 'number') {
            const hi = calculateHeatIndex(tempF, humPct);
            const wc = typeof windMph === 'number' ? calculateWindChill(tempF, windMph) : null;
            if (hi != null && hi !== tempF) feelsLike = `Heat Index: ${hi}°F`;
            else if (wc != null && wc !== tempF) feelsLike = `Wind Chill: ${wc}°F`;
        }
        
        document.getElementById('wxTemp').textContent = tempF;
        document.getElementById('wxConditions').textContent = cond;
        document.getElementById('wxWind').textContent = `${windMph} mph`;
        document.getElementById('wxGusts').textContent = gustMph !== '--' ? `${gustMph} mph` : 'None';
        document.getElementById('wxHumidity').textContent = `${humPct}%`;
        document.getElementById('wxVisibility').textContent = `${visMi} mi`;
        document.getElementById('wxPressure').textContent = `${pressIn}"`;
        document.getElementById('wxWindDir').textContent = degreesToCompass(windDir);
        document.getElementById('wxDewDepression').textContent = dewDep;
        document.getElementById('wxFeelsLike').textContent = feelsLike;
        
        const dewEl = document.getElementById('wxDewpoint');
        dewEl.textContent = `${dewF}°F`;
        if (typeof dewF === 'number') dewEl.className = `detail-value ${getDewpointClass(dewF)}`;
        
        state.lastUpdate = new Date();
        const ct = new Date(state.lastUpdate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        let h = ct.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        document.getElementById('lastUpdate').textContent = `Last: ${h}:${padZero(ct.getMinutes())} ${ampm}`;
        
        const ts = Date.now();
        const spc = document.getElementById('spcOutlook');
        const radar = document.getElementById('nwsRadar');
        if (spc) spc.src = `https://www.spc.noaa.gov/products/outlook/day1otlk.gif?t=${ts}`;
        if (radar) radar.src = `https://radar.weather.gov/ridge/standard/KSRX_0.gif?t=${ts}`;
        
        console.log('Weather updated');
    } catch (e) {
        console.error('Weather error:', e);
        document.getElementById('wxConditions').textContent = 'Error';
    }
}

// ================================================
// Cameras
// ================================================
async function getCameraCount() {
    try {
        const res = await fetch(CONFIG.IDRIVE_CAMERAS_URL);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        
        if (Array.isArray(data)) state.cameras = data;
        else if (data.features) {
            state.cameras = data.features.map(f => ({
                ...f.properties,
                latitude: f.geometry?.coordinates?.[1],
                longitude: f.geometry?.coordinates?.[0]
            }));
        } else state.cameras = [];
        
        document.getElementById('cameraCount').textContent = state.cameras.length || '~547';
        console.log(`Cameras: ${state.cameras.length}`);
    } catch (e) {
        console.error('Camera error:', e);
        document.getElementById('cameraCount').textContent = '~547';
    }
}

// ================================================
// iDriveArkansas Incidents (doTheThing)
// ================================================
async function doTheThing() {
    const bridgeCheck = document.getElementById('bridgeCheck');
    const ignoreBridges = bridgeCheck ? bridgeCheck.checked : true;
    
    try {
        const res = await fetch(CONFIG.IDRIVE_EVENTS_URL);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        
        let events = [];
        if (Array.isArray(data)) events = data;
        else if (data.features) {
            events = data.features.map(f => ({
                ...f.properties,
                latitude: f.geometry?.coordinates?.[1],
                longitude: f.geometry?.coordinates?.[0]
            }));
        } else if (data.events) events = data.events;
        
        // Filter
        const filtered = events.filter(e => {
            const id = String(e.id || e.event_id || e.ID || '');
            const type = (e.type || e.event_type || e.eventType || '').toLowerCase();
            const desc = (e.description || e.headline || e.desc || '').toLowerCase();
            const routeType = (e.route_type || e.routeType || '').toLowerCase();
            
            if (state.ignoredIds.includes(id)) return false;
            if (ignoreBridges) {
                if (type.includes('construction') || desc.includes('construction')) return false;
                if (type.includes('maintenance') || desc.includes('maintenance')) return false;
                if (type.includes('bridge') || desc.includes('bridge')) return false;
                if (routeType.includes('bridge')) return false;
            }
            return true;
        });
        
        // Add nearest camera
        const processed = filtered.map(e => {
            const lat = e.latitude || e.lat;
            const lon = e.longitude || e.lon || e.lng;
            return { ...e, nearestCamera: (lat && lon) ? findNearestCamera(lat, lon) : null };
        });
        
        renderIncidentsTable(processed);
        
        if (state.autoPlaySound && processed.length > state.previousIncidentCount && state.previousIncidentCount > 0) {
            playAlertSound();
        }
        state.previousIncidentCount = processed.length;
        
        console.log(`Incidents: ${processed.length}`);
    } catch (e) {
        console.error('Incidents error:', e);
        document.getElementById('incidentTableBody').innerHTML = 
            `<tr><td colspan="10" class="text-center text-danger">Error loading: ${e.message}</td></tr>`;
    }
}

function renderIncidentsTable(events) {
    const tbody = document.getElementById('incidentTableBody');
    const countEl = document.getElementById('incidentCount');
    
    countEl.textContent = events.length;
    document.title = events.length > 0 ? `(${events.length}) NWA Grid Dashboard` : 'NWA Grid Dashboard';
    
    if (!events.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-success"><i class="bi bi-check-circle-fill"></i> No active incidents</td></tr>`;
        return;
    }
    
    tbody.innerHTML = events.map(e => {
        const id = e.id || e.event_id || e.ID || Math.random().toString(36).substr(2,9);
        const county = e.county || e.County || '--';
        const type = e.type || e.event_type || e.eventType || 'Unknown';
        const route = e.route || e.road_name || e.Route || '--';
        const routeType = e.route_type || e.routeType || e.RouteType || '--';
        const desc = e.description || e.headline || e.desc || 'No description';
        const lanes = e.lanes_affected || e.lanesAffected || e.Lanes || '--';
        const reporter = e.reported_by || e.reportedBy || e.source || 'ARDOT';
        
        let camText = '--';
        if (e.nearestCamera) camText = `${e.nearestCamera.distance.toFixed(2)} Miles`;
        
        const lat = e.latitude || e.lat;
        const lon = e.longitude || e.lon || e.lng;
        const mapLink = lat && lon 
            ? `<a href="https://www.idrivearkansas.com/map?lat=${lat}&lng=${lon}&zoom=15" target="_blank" class="btn btn-sm btn-outline-neon">Show on iDriveArkansas</a>`
            : '--';
        
        const typeClass = getIncidentTypeClass(type);
        
        return `<tr>
            <td><button class="btn-ignore" onclick="ignoreId('${id}')" title="Ignore"><i class="bi bi-eye-slash"></i> Ignore</button></td>
            <td>${county}</td>
            <td><span class="incident-type ${typeClass}">${type}</span></td>
            <td>${route}</td>
            <td>${routeType}</td>
            <td title="${desc}">${desc.substring(0,50)}${desc.length > 50 ? '...' : ''}</td>
            <td>${lanes}</td>
            <td>${reporter}</td>
            <td>${camText}</td>
            <td>${mapLink}</td>
        </tr>`;
    }).join('');
}

function getIncidentTypeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('crash') || t.includes('accident')) return 'incident-crash';
    if (t.includes('construction')) return 'incident-construction';
    if (t.includes('closure') || t.includes('closed')) return 'incident-closure';
    if (t.includes('weather') || t.includes('flood')) return 'incident-weather';
    return 'incident-other';
}

function ignoreId(id) {
    const idStr = String(id);
    if (!state.ignoredIds.includes(idStr)) {
        state.ignoredIds.push(idStr);
        localStorage.setItem('ignoredIds', JSON.stringify(state.ignoredIds));
    }
    doTheThing();
}

function clearIgnored() {
    state.ignoredIds = [];
    localStorage.setItem('ignoredIds', JSON.stringify(state.ignoredIds));
    doTheThing();
}

function autoPlay() {
    const cb = document.getElementById('autoPlayCheck');
    state.autoPlaySound = cb ? cb.checked : false;
    const btn = document.getElementById('soundToggle');
    const icon = btn?.querySelector('i');
    if (icon) icon.className = state.autoPlaySound ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
}

function playAlertSound() {
    const player = document.getElementById('musicplayer');
    if (player && state.autoPlaySound) {
        player.currentTime = 0;
        player.play().catch(e => console.log('Audio blocked:', e));
    }
}

// ================================================
// Iframe Refresh
// ================================================
function refreshIframe(id) {
    const iframe = document.getElementById(id);
    if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => { iframe.src = src; }, 100);
    }
}

function refreshMapPanel() {
    const img = document.getElementById('mapPreviewImg');
    if (img) img.src = img.src.split('?')[0] + '?t=' + Date.now();
}

function refreshRadarPanel() {
    const radar = document.getElementById('nwsRadar');
    if (radar) radar.src = `https://radar.weather.gov/ridge/standard/KSRX_0.gif?t=${Date.now()}`;
    refreshIframe('pivotalRadarIframe');
}

function refreshSeverePanel() {
    refreshIframe('spcIframe');
    refreshIframe('nhcIframe');
}

function refreshModelsPanel() {
    refreshIframe('soundingsIframe');
}

// ================================================
// Tabs with Dynamic External Links
// ================================================
function initTabs() {
    document.querySelectorAll('.panel-tabs').forEach(tabContainer => {
        const panel = tabContainer.closest('.grid-panel');
        const tabs = tabContainer.querySelectorAll('.tab-btn');
        const contents = panel.querySelectorAll('.tab-content');
        const extLink = panel.querySelector('.panel-external-link');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab + '-tab';
                const targetUrl = tab.dataset.url;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                contents.forEach(c => {
                    c.classList.remove('active');
                    if (c.id === targetId) c.classList.add('active');
                });
                
                // Update external link to match selected tab
                if (extLink && targetUrl) {
                    extLink.href = targetUrl;
                    extLink.title = `Open ${tab.textContent}`;
                }
            });
        });
    });
}

// ================================================
// Refresh All
// ================================================
function refreshAll() {
    state.refreshCountdown = 300;
    getWeather();
    getCameraCount();
    doTheThing();
    refreshMapPanel();
    refreshRadarPanel();
    refreshSeverePanel();
    refreshModelsPanel();
    refreshIframe('adsbIframe');
    refreshIframe('nwsIframe');
    refreshIframe('streamsIframe');
    
    const btn = document.getElementById('refreshAllBtn');
    if (btn) {
        btn.classList.add('rotating');
        setTimeout(() => btn.classList.remove('rotating'), 1000);
    }
}

// ================================================
// Init
// ================================================
function initEventListeners() {
    document.getElementById('refreshAllBtn')?.addEventListener('click', refreshAll);
    document.getElementById('soundToggle')?.addEventListener('click', () => {
        const cb = document.getElementById('autoPlayCheck');
        if (cb) { cb.checked = !cb.checked; autoPlay(); }
    });
    document.getElementById('bridgeCheck')?.addEventListener('change', doTheThing);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('NWA Grid Dashboard initializing...');
    console.log('Rework of Cameron Wilson\'s airtrak.me by Maximiliano Garcia');
    console.log('GitHub: https://github.com/maxgarcia642/NWAeroGridashboard');
    
    initEventListeners();
    initTabs();
    
    getCameraCount();
    getWeather();
    doTheThing();
    
    updateCentralClock();
    setInterval(updateCentralClock, 1000);
    setInterval(updateRefreshTimer, 1000);
    
    setInterval(getWeather, CONFIG.REFRESH_WEATHER);
    setInterval(doTheThing, CONFIG.REFRESH_INCIDENTS);
    setInterval(getCameraCount, CONFIG.REFRESH_CAMERAS);
    
    console.log('Dashboard initialized!');
});

// Rotating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .rotating i { animation: rotate 1s linear; }
`;
document.head.appendChild(style);
