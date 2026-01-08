/**
 * NWA Grid Dashboard - Weather & Traffic Management System
 * Vaporwave Weather Channel Style
 */

// ================================================
// Configuration
// ================================================
const CONFIG = {
    // NWS API Configuration
    NWS_STATION: 'KASG', // Springdale, AR
    NWS_API_BASE: 'https://api.weather.gov',
    
    // iDriveArkansas API
    IDRIVE_INCIDENTS_URL: 'https://www.idrivearkansas.com/api/events/geojson',
    IDRIVE_CAMERAS_URL: 'https://www.idrivearkansas.com/api/cameras',
    
    // Location (Springdale, AR area)
    HOME_LOCATION: {
        lat: 36.1867,
        lon: -94.1288
    },
    
    // Refresh intervals (in milliseconds)
    REFRESH_WEATHER: 5 * 60 * 1000,      // 5 minutes
    REFRESH_INCIDENTS: 30 * 1000,         // 30 seconds
    REFRESH_CAMERAS: 10 * 60 * 1000,      // 10 minutes
    
    // Filter keywords for incidents
    IGNORE_KEYWORDS: ['maintenance', 'construction', 'routine']
};

// ================================================
// State Management
// ================================================
const state = {
    ignoredIds: JSON.parse(localStorage.getItem('ignoredIds') || '[]'),
    cameras: [],
    incidents: [],
    hideBridges: false,
    autoPlaySound: false,
    lastUpdate: null,
    refreshCountdown: 300 // seconds
};

// ================================================
// Utility Functions
// ================================================

/**
 * Convert degrees to radians
 */
function degToRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} loc1 - {lat, lon}
 * @param {Object} loc2 - {lat, lon}
 * @returns {number} Distance in miles
 */
function getDistance(loc1, loc2) {
    const R = 3959; // Earth's radius in miles
    const dLat = degToRad(loc2.lat - loc1.lat);
    const dLon = degToRad(loc2.lon - loc1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(degToRad(loc1.lat)) * Math.cos(degToRad(loc2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format number with leading zero
 */
function padZero(num) {
    return num < 10 ? '0' + num : num;
}

/**
 * Format timestamp for display
 */
function formatTime(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

/**
 * Get incident type class for styling
 */
function getIncidentTypeClass(type) {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('crash') || typeLower.includes('accident')) return 'incident-crash';
    if (typeLower.includes('construction')) return 'incident-construction';
    if (typeLower.includes('closure') || typeLower.includes('closed')) return 'incident-closure';
    if (typeLower.includes('weather') || typeLower.includes('flood')) return 'incident-weather';
    return 'incident-other';
}

/**
 * Get dewpoint comfort class
 */
function getDewpointClass(dewpoint) {
    if (dewpoint < 55) return 'dewpoint-comfortable';
    if (dewpoint < 65) return 'dewpoint-sticky';
    if (dewpoint < 70) return 'dewpoint-oppressive';
    return 'dewpoint-miserable';
}

// ================================================
// UTC Clock
// ================================================

/**
 * Update UTC clock display
 */
function updateUTCClock() {
    const now = new Date();
    const utcHours = padZero(now.getUTCHours());
    const utcMinutes = padZero(now.getUTCMinutes());
    const utcSeconds = padZero(now.getUTCSeconds());
    
    document.getElementById('utcClock').textContent = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;
}

/**
 * Update refresh countdown timer
 */
function updateRefreshTimer() {
    state.refreshCountdown--;
    
    if (state.refreshCountdown <= 0) {
        state.refreshCountdown = 300;
    }
    
    const minutes = Math.floor(state.refreshCountdown / 60);
    const seconds = state.refreshCountdown % 60;
    
    document.getElementById('refreshTimer').textContent = `${minutes}:${padZero(seconds)}`;
}

// ================================================
// Weather Functions
// ================================================

/**
 * Fetch current weather observations from NWS API
 */
async function getWeather() {
    const stationUrl = `${CONFIG.NWS_API_BASE}/stations/${CONFIG.NWS_STATION}/observations/latest`;
    
    try {
        const response = await fetch(stationUrl, {
            headers: {
                'User-Agent': 'NWA Grid Dashboard',
                'Accept': 'application/geo+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        
        const data = await response.json();
        const props = data.properties;
        
        // Extract and convert values
        const tempC = props.temperature?.value;
        const dewpointC = props.dewpoint?.value;
        const windSpeedKmh = props.windSpeed?.value;
        const windGustKmh = props.windGust?.value;
        const humidity = props.relativeHumidity?.value;
        const conditions = props.textDescription || 'Unknown';
        
        // Convert to Fahrenheit and mph
        const tempF = tempC !== null ? Math.round((tempC * 9/5) + 32) : '--';
        const dewpointF = dewpointC !== null ? Math.round((dewpointC * 9/5) + 32) : '--';
        const windMph = windSpeedKmh !== null ? Math.round(windSpeedKmh * 0.621371) : '--';
        const gustMph = windGustKmh !== null ? Math.round(windGustKmh * 0.621371) : '--';
        const humidityPct = humidity !== null ? Math.round(humidity) : '--';
        
        // Update DOM
        document.getElementById('wxTemp').textContent = tempF;
        document.getElementById('wxConditions').textContent = conditions;
        document.getElementById('wxWind').textContent = `${windMph} mph`;
        document.getElementById('wxGusts').textContent = gustMph !== '--' ? `${gustMph} mph` : 'None';
        document.getElementById('wxHumidity').textContent = `${humidityPct}%`;
        
        // Update dewpoint with color coding
        const dewpointEl = document.getElementById('wxDewpoint');
        dewpointEl.textContent = `${dewpointF}°F`;
        dewpointEl.className = `detail-value ${getDewpointClass(dewpointF)}`;
        
        // Update last update time
        state.lastUpdate = new Date();
        document.getElementById('lastUpdate').textContent = `Last update: ${formatTime(state.lastUpdate)}`;
        
        // Refresh radar and outlook images (cache busting)
        const timestamp = Date.now();
        document.getElementById('spcOutlook').src = 
            `https://www.spc.noaa.gov/products/outlook/day1otlk.gif?t=${timestamp}`;
        document.getElementById('nwsRadar').src = 
            `https://radar.weather.gov/ridge/standard/KSRX_0.gif?t=${timestamp}`;
        
        console.log('Weather updated successfully');
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('wxConditions').textContent = 'Error loading weather';
    }
}

// ================================================
// iDriveArkansas Functions
// ================================================

/**
 * Fetch camera count from iDriveArkansas
 */
async function getCameraCount(firstRun = false) {
    try {
        const response = await fetch(CONFIG.IDRIVE_CAMERAS_URL);
        
        if (!response.ok) {
            throw new Error(`Cameras API error: ${response.status}`);
        }
        
        const data = await response.json();
        state.cameras = data.features || data || [];
        
        const count = Array.isArray(state.cameras) ? state.cameras.length : 0;
        document.getElementById('cameraCount').textContent = count;
        
        console.log(`Cameras loaded: ${count}`);
        
    } catch (error) {
        console.error('Error fetching cameras:', error);
        // Use fallback camera data for demo
        document.getElementById('cameraCount').textContent = '~500';
    }
}

/**
 * Fetch incidents from iDriveArkansas
 */
async function getIncidents() {
    try {
        const response = await fetch(CONFIG.IDRIVE_INCIDENTS_URL);
        
        if (!response.ok) {
            throw new Error(`Incidents API error: ${response.status}`);
        }
        
        const data = await response.json();
        state.incidents = data.features || [];
        
        console.log(`Incidents loaded: ${state.incidents.length}`);
        
        return state.incidents;
        
    } catch (error) {
        console.error('Error fetching incidents:', error);
        return [];
    }
}

/**
 * Filter and process incidents
 */
function filterIncidents(incidents) {
    return incidents.filter(incident => {
        const props = incident.properties || {};
        const id = props.id || incident.id;
        const type = (props.type || props.event_type || '').toLowerCase();
        const description = (props.description || props.headline || '').toLowerCase();
        
        // Skip ignored IDs
        if (state.ignoredIds.includes(id)) {
            return false;
        }
        
        // Skip bridges if checkbox is checked
        if (state.hideBridges && (type.includes('bridge') || description.includes('bridge'))) {
            return false;
        }
        
        // Skip maintenance/construction keywords (optional filter)
        // for (const keyword of CONFIG.IGNORE_KEYWORDS) {
        //     if (description.includes(keyword)) return false;
        // }
        
        return true;
    });
}

/**
 * Calculate distance to nearest camera for each incident
 */
function calculateDistances(incidents) {
    return incidents.map(incident => {
        const coords = incident.geometry?.coordinates;
        if (!coords) return { ...incident, distance: null };
        
        const incidentLoc = { lat: coords[1], lon: coords[0] };
        const distance = getDistance(CONFIG.HOME_LOCATION, incidentLoc);
        
        return { ...incident, distance: Math.round(distance * 10) / 10 };
    }).sort((a, b) => (a.distance || 999) - (b.distance || 999));
}

/**
 * Render incidents table
 */
function renderIncidentsTable(incidents) {
    const tbody = document.getElementById('incidentTableBody');
    const countEl = document.getElementById('incidentCount');
    
    countEl.textContent = incidents.length;
    
    // Update page title with incident count
    document.title = incidents.length > 0 
        ? `(${incidents.length}) NWA Grid Dashboard` 
        : 'NWA Grid Dashboard';
    
    if (incidents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="bi bi-check-circle-fill text-success"></i>
                    No active incidents
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = incidents.map(incident => {
        const props = incident.properties || {};
        const id = props.id || incident.id || Math.random().toString(36).substr(2, 9);
        const type = props.type || props.event_type || 'Unknown';
        const description = props.description || props.headline || 'No description';
        const location = props.location || props.road_name || 'Unknown location';
        const distance = incident.distance !== null ? `${incident.distance} mi` : '--';
        
        return `
            <tr>
                <td>
                    <span class="incident-type ${getIncidentTypeClass(type)}">${type}</span>
                </td>
                <td>${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</td>
                <td>${location}</td>
                <td>${distance}</td>
                <td>
                    <button class="btn-ignore" onclick="ignoreId('${id}')" title="Hide this incident">
                        <i class="bi bi-eye-slash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Main function to fetch and display incidents
 */
async function doTheThing() {
    const rawIncidents = await getIncidents();
    const filteredIncidents = filterIncidents(rawIncidents);
    const processedIncidents = calculateDistances(filteredIncidents);
    
    renderIncidentsTable(processedIncidents);
    updateMap(processedIncidents);
    
    // Play sound if new incidents and sound enabled
    if (state.autoPlaySound && processedIncidents.length > 0) {
        playAlertSound();
    }
}

/**
 * Ignore an incident by ID
 */
function ignoreId(id) {
    if (!state.ignoredIds.includes(id)) {
        state.ignoredIds.push(id);
        localStorage.setItem('ignoredIds', JSON.stringify(state.ignoredIds));
    }
    doTheThing();
}

/**
 * Clear all ignored incidents
 */
function clearIgnored() {
    state.ignoredIds = [];
    localStorage.setItem('ignoredIds', JSON.stringify(state.ignoredIds));
    doTheThing();
}

// ================================================
// Map Functions (OpenLayers)
// ================================================

let map = null;
let incidentLayer = null;

/**
 * Initialize OpenLayers map
 */
function initMap() {
    // Create vector source for incidents
    const incidentSource = new ol.source.Vector();
    
    // Create incident layer with custom styling
    incidentLayer = new ol.layer.Vector({
        source: incidentSource,
        style: function(feature) {
            const type = feature.get('type') || '';
            let color = '#607d8b';
            
            if (type.toLowerCase().includes('crash')) color = '#f44336';
            else if (type.toLowerCase().includes('construction')) color = '#ff9800';
            else if (type.toLowerCase().includes('closure')) color = '#9c27b0';
            else if (type.toLowerCase().includes('weather')) color = '#2196f3';
            
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 8,
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({
                        color: '#fff',
                        width: 2
                    })
                })
            });
        }
    });
    
    // Create map
    map = new ol.Map({
        target: 'incidentMap',
        layers: [
            // Dark base layer (CartoDB Dark Matter)
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                    attributions: '© <a href="https://carto.com/">CARTO</a>'
                })
            }),
            incidentLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([CONFIG.HOME_LOCATION.lon, CONFIG.HOME_LOCATION.lat]),
            zoom: 9
        }),
        controls: ol.control.defaults.defaults().extend([
            new ol.control.ScaleLine()
        ])
    });
    
    // Add click handler for popups
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });
        
        if (feature) {
            const description = feature.get('description') || 'No description';
            const location = feature.get('location') || '';
            alert(`${description}\n\n${location}`);
        }
    });
    
    console.log('Map initialized');
}

/**
 * Update map with incident markers
 */
function updateMap(incidents) {
    if (!incidentLayer) return;
    
    const source = incidentLayer.getSource();
    source.clear();
    
    incidents.forEach(incident => {
        const coords = incident.geometry?.coordinates;
        if (!coords) return;
        
        const props = incident.properties || {};
        
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coords)),
            type: props.type || props.event_type || 'Unknown',
            description: props.description || props.headline || 'No description',
            location: props.location || props.road_name || ''
        });
        
        source.addFeature(feature);
    });
}

// ================================================
// Tab Switching
// ================================================

/**
 * Initialize tab functionality
 */
function initTabs() {
    document.querySelectorAll('.panel-tabs').forEach(tabContainer => {
        const panel = tabContainer.closest('.grid-panel');
        const tabs = tabContainer.querySelectorAll('.tab-btn');
        const contents = panel.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab + '-tab';
                
                // Update active tab button
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) {
                        content.classList.add('active');
                    }
                });
            });
        });
    });
}

// ================================================
// Sound Functions
// ================================================

/**
 * Toggle autoplay sound
 */
function toggleSound() {
    state.autoPlaySound = !state.autoPlaySound;
    
    const btn = document.getElementById('soundToggle');
    const icon = btn.querySelector('i');
    
    if (state.autoPlaySound) {
        icon.className = 'bi bi-volume-up-fill';
        btn.classList.add('active');
    } else {
        icon.className = 'bi bi-volume-mute-fill';
        btn.classList.remove('active');
    }
}

/**
 * Play alert sound
 */
function playAlertSound() {
    const player = document.getElementById('musicplayer');
    if (player && state.autoPlaySound) {
        player.currentTime = 0;
        player.play().catch(e => console.log('Audio play prevented:', e));
    }
}

// ================================================
// Refresh Functions
// ================================================

/**
 * Refresh all data
 */
function refreshAll() {
    state.refreshCountdown = 300;
    getWeather();
    doTheThing();
    getCameraCount();
    
    // Visual feedback
    const btn = document.getElementById('refreshAllBtn');
    btn.classList.add('rotating');
    setTimeout(() => btn.classList.remove('rotating'), 1000);
}

// ================================================
// Event Listeners
// ================================================

function initEventListeners() {
    // Bridge filter checkbox
    document.getElementById('bridgeCheck').addEventListener('change', (e) => {
        state.hideBridges = e.target.checked;
        doTheThing();
    });
    
    // Refresh incidents button
    document.getElementById('refreshIncidents').addEventListener('click', doTheThing);
    
    // Clear ignored button
    document.getElementById('clearIgnored').addEventListener('click', clearIgnored);
    
    // Refresh all button
    document.getElementById('refreshAllBtn').addEventListener('click', refreshAll);
    
    // Sound toggle button
    document.getElementById('soundToggle').addEventListener('click', toggleSound);
}

// ================================================
// Initialization
// ================================================

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('NWA Grid Dashboard initializing...');
    
    // Initialize components
    initEventListeners();
    initTabs();
    initMap();
    
    // Initial data fetch
    getCameraCount(true);
    getWeather();
    doTheThing();
    
    // Start clocks
    updateUTCClock();
    setInterval(updateUTCClock, 1000);
    setInterval(updateRefreshTimer, 1000);
    
    // Set up refresh intervals
    setInterval(getWeather, CONFIG.REFRESH_WEATHER);
    setInterval(doTheThing, CONFIG.REFRESH_INCIDENTS);
    setInterval(getCameraCount, CONFIG.REFRESH_CAMERAS);
    
    console.log('Dashboard initialized successfully!');
});

// ================================================
// Add rotating animation CSS dynamically
// ================================================
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .rotating i {
        animation: rotate 1s linear;
    }
`;
document.head.appendChild(style);
