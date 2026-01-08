/**
 * NWA Grid Dashboard - Weather & Traffic Management System
 * Vaporwave Weather Channel Style
 * 
 * Rework of Cameron Wilson's airtrak.me Site
 * by Maximiliano Garcia
 */

// ================================================
// Configuration
// ================================================
const CONFIG = {
    // NWS API Configuration
    NWS_STATION: 'KASG', // Springdale, AR
    NWS_API_BASE: 'https://api.weather.gov',
    
    // iDriveArkansas API - Using the same endpoints as airtrak.me
    IDRIVE_EVENTS_URL: 'https://www.idrivearkansas.com/api/events',
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
};

// ================================================
// State Management
// ================================================
const state = {
    ignoredIds: JSON.parse(localStorage.getItem('ignoredIds') || '[]'),
    cameras: [],
    incidents: [],
    autoPlaySound: false,
    lastUpdate: null,
    refreshCountdown: 300, // seconds
    previousIncidentCount: 0
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

/**
 * Convert wind direction degrees to compass direction
 */
function degreesToCompass(degrees) {
    if (degrees === null || degrees === undefined) return '--';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Calculate heat index (for temps >= 80°F)
 */
function calculateHeatIndex(tempF, humidity) {
    if (tempF < 80 || humidity === null) return null;
    
    const T = tempF;
    const R = humidity;
    
    let HI = -42.379 + 2.04901523 * T + 10.14333127 * R 
           - 0.22475541 * T * R - 0.00683783 * T * T 
           - 0.05481717 * R * R + 0.00122874 * T * T * R 
           + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
    
    return Math.round(HI);
}

/**
 * Calculate wind chill (for temps <= 50°F and wind >= 3 mph)
 */
function calculateWindChill(tempF, windMph) {
    if (tempF > 50 || windMph < 3) return null;
    
    const WC = 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) 
             + 0.4275 * tempF * Math.pow(windMph, 0.16);
    
    return Math.round(WC);
}

/**
 * Find nearest camera to a location
 */
function findNearestCamera(lat, lon) {
    if (!state.cameras || state.cameras.length === 0) return null;
    
    let minDistance = Infinity;
    let nearestCamera = null;
    
    for (const camera of state.cameras) {
        const camLat = camera.latitude || camera.lat;
        const camLon = camera.longitude || camera.lon || camera.lng;
        
        if (camLat && camLon) {
            const distance = getDistance(
                { lat: lat, lon: lon },
                { lat: camLat, lon: camLon }
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestCamera = { ...camera, distance: distance };
            }
        }
    }
    
    return nearestCamera;
}

// ================================================
// Central Time Clock (12-hour format with AM/PM)
// ================================================

/**
 * Update Central Time clock display
 */
function updateCentralClock() {
    const now = new Date();
    
    // Convert to Central Time
    const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    
    let hours = centralTime.getHours();
    const minutes = padZero(centralTime.getMinutes());
    const seconds = padZero(centralTime.getSeconds());
    
    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    document.getElementById('centralClock').textContent = `${hours}:${minutes}:${seconds} ${ampm} CT`;
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
        
        // Extract values
        const tempC = props.temperature?.value;
        const dewpointC = props.dewpoint?.value;
        const windSpeedKmh = props.windSpeed?.value;
        const windGustKmh = props.windGust?.value;
        const windDirection = props.windDirection?.value;
        const humidity = props.relativeHumidity?.value;
        const visibilityM = props.visibility?.value;
        const pressurePa = props.barometricPressure?.value;
        const conditions = props.textDescription || 'Unknown';
        
        // Convert units
        const tempF = tempC !== null && tempC !== undefined ? Math.round((tempC * 9/5) + 32) : '--';
        const dewpointF = dewpointC !== null && dewpointC !== undefined ? Math.round((dewpointC * 9/5) + 32) : '--';
        const windMph = windSpeedKmh !== null && windSpeedKmh !== undefined ? Math.round(windSpeedKmh * 0.621371) : '--';
        const gustMph = windGustKmh !== null && windGustKmh !== undefined ? Math.round(windGustKmh * 0.621371) : '--';
        const humidityPct = humidity !== null && humidity !== undefined ? Math.round(humidity) : '--';
        const visibilityMi = visibilityM !== null && visibilityM !== undefined ? Math.round(visibilityM / 1609.34 * 10) / 10 : '--';
        const pressureInHg = pressurePa !== null && pressurePa !== undefined ? (pressurePa / 3386.39).toFixed(2) : '--';
        const windDir = degreesToCompass(windDirection);
        
        // Calculate dewpoint depression
        let dewDepression = '--';
        if (typeof tempF === 'number' && typeof dewpointF === 'number') {
            dewDepression = (tempF - dewpointF) + '°F';
        }
        
        // Calculate feels like
        let feelsLike = '';
        if (typeof tempF === 'number' && typeof humidityPct === 'number') {
            const heatIndex = calculateHeatIndex(tempF, humidityPct);
            const windChill = typeof windMph === 'number' ? calculateWindChill(tempF, windMph) : null;
            
            if (heatIndex !== null && heatIndex !== tempF) {
                feelsLike = `Heat Index: ${heatIndex}°F`;
            } else if (windChill !== null && windChill !== tempF) {
                feelsLike = `Wind Chill: ${windChill}°F`;
            }
        }
        
        // Update DOM
        document.getElementById('wxTemp').textContent = tempF;
        document.getElementById('wxConditions').textContent = conditions;
        document.getElementById('wxWind').textContent = `${windMph} mph`;
        document.getElementById('wxGusts').textContent = gustMph !== '--' ? `${gustMph} mph` : 'None';
        document.getElementById('wxHumidity').textContent = `${humidityPct}%`;
        document.getElementById('wxVisibility').textContent = `${visibilityMi} mi`;
        document.getElementById('wxPressure').textContent = `${pressureInHg}"`;
        document.getElementById('wxWindDir').textContent = windDir;
        document.getElementById('wxDewDepression').textContent = dewDepression;
        document.getElementById('wxFeelsLike').textContent = feelsLike;
        
        // Update dewpoint with color coding
        const dewpointEl = document.getElementById('wxDewpoint');
        dewpointEl.textContent = `${dewpointF}°F`;
        if (typeof dewpointF === 'number') {
            dewpointEl.className = `detail-value ${getDewpointClass(dewpointF)}`;
        }
        
        // Update last update time (in Central Time)
        state.lastUpdate = new Date();
        const centralTime = new Date(state.lastUpdate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        let hours = centralTime.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        document.getElementById('lastUpdate').textContent = `Last: ${hours}:${padZero(centralTime.getMinutes())} ${ampm}`;
        
        // Refresh images
        const timestamp = Date.now();
        const spcOutlook = document.getElementById('spcOutlook');
        const nwsRadar = document.getElementById('nwsRadar');
        
        if (spcOutlook) spcOutlook.src = `https://www.spc.noaa.gov/products/outlook/day1otlk.gif?t=${timestamp}`;
        if (nwsRadar) nwsRadar.src = `https://radar.weather.gov/ridge/standard/KSRX_0.gif?t=${timestamp}`;
        
        console.log('Weather updated successfully');
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('wxConditions').textContent = 'Error loading';
    }
}

// ================================================
// iDriveArkansas Functions (Based on airtrak.me)
// ================================================

/**
 * Fetch cameras from iDriveArkansas
 */
async function getCameraCount(firstRun = false) {
    try {
        const response = await fetch(CONFIG.IDRIVE_CAMERAS_URL);
        
        if (!response.ok) throw new Error(`Cameras API error: ${response.status}`);
        
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
            state.cameras = data;
        } else if (data.features) {
            state.cameras = data.features.map(f => ({
                ...f.properties,
                latitude: f.geometry?.coordinates?.[1],
                longitude: f.geometry?.coordinates?.[0]
            }));
        } else {
            state.cameras = [];
        }
        
        document.getElementById('cameraCount').textContent = state.cameras.length;
        console.log(`Cameras loaded: ${state.cameras.length}`);
        
    } catch (error) {
        console.error('Error fetching cameras:', error);
        document.getElementById('cameraCount').textContent = '~500';
    }
}

/**
 * Main function to fetch and display incidents (doTheThing from airtrak.me)
 */
async function doTheThing() {
    const bridgeCheck = document.getElementById('bridgeCheck');
    const ignoreBridges = bridgeCheck ? bridgeCheck.checked : true;
    
    try {
        const response = await fetch(CONFIG.IDRIVE_EVENTS_URL);
        
        if (!response.ok) throw new Error(`Events API error: ${response.status}`);
        
        const data = await response.json();
        let events = [];
        
        // Handle different response formats
        if (Array.isArray(data)) {
            events = data;
        } else if (data.features) {
            events = data.features.map(f => ({
                ...f.properties,
                latitude: f.geometry?.coordinates?.[1],
                longitude: f.geometry?.coordinates?.[0]
            }));
        } else if (data.events) {
            events = data.events;
        }
        
        // Filter events
        const filteredEvents = events.filter(event => {
            const id = event.id || event.event_id || event.ID;
            const type = (event.type || event.event_type || event.eventType || '').toLowerCase();
            const description = (event.description || event.headline || event.desc || '').toLowerCase();
            const routeType = (event.route_type || event.routeType || '').toLowerCase();
            
            // Skip ignored IDs
            if (state.ignoredIds.includes(String(id))) return false;
            
            // Skip bridges, construction, maintenance if checkbox is checked
            if (ignoreBridges) {
                if (type.includes('construction') || description.includes('construction')) return false;
                if (type.includes('maintenance') || description.includes('maintenance')) return false;
                if (type.includes('bridge') || description.includes('bridge')) return false;
                if (routeType.includes('bridge')) return false;
            }
            
            return true;
        });
        
        // Sort by distance
        const processedEvents = filteredEvents.map(event => {
            const lat = event.latitude || event.lat;
            const lon = event.longitude || event.lon || event.lng;
            
            let nearestCamera = null;
            if (lat && lon) {
                nearestCamera = findNearestCamera(lat, lon);
            }
            
            return { ...event, nearestCamera };
        });
        
        // Render table
        renderIncidentsTable(processedEvents);
        updateMap(processedEvents);
        
        // Play sound if new incidents
        if (state.autoPlaySound && processedEvents.length > state.previousIncidentCount && state.previousIncidentCount !== 0) {
            playAlertSound();
        }
        state.previousIncidentCount = processedEvents.length;
        
        console.log(`Incidents loaded: ${processedEvents.length}`);
        
    } catch (error) {
        console.error('Error fetching incidents:', error);
        document.getElementById('incidentTableBody').innerHTML = `
            <tr><td colspan="8" class="text-center text-danger">Error loading incidents: ${error.message}</td></tr>
        `;
    }
}

/**
 * Render incidents table (matching airtrak.me structure)
 */
function renderIncidentsTable(events) {
    const tbody = document.getElementById('incidentTableBody');
    const countEl = document.getElementById('incidentCount');
    
    countEl.textContent = events.length;
    
    // Update page title
    document.title = events.length > 0 
        ? `(${events.length}) NWA Grid Dashboard` 
        : 'NWA Grid Dashboard';
    
    if (events.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-success">
                    <i class="bi bi-check-circle-fill"></i> No active incidents
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = events.map(event => {
        const id = event.id || event.event_id || event.ID || Math.random().toString(36).substr(2, 9);
        const county = event.county || event.County || '--';
        const type = event.type || event.event_type || event.eventType || 'Unknown';
        const route = event.route || event.road_name || event.Route || '--';
        const description = event.description || event.headline || event.desc || 'No description';
        const lanes = event.lanes_affected || event.lanesAffected || event.Lanes || '--';
        
        // Nearest camera
        let cameraText = '--';
        if (event.nearestCamera) {
            cameraText = `${event.nearestCamera.distance.toFixed(2)} mi`;
        }
        
        // iDrive map link
        const lat = event.latitude || event.lat;
        const lon = event.longitude || event.lon || event.lng;
        const mapLink = lat && lon 
            ? `<a href="https://www.idrivearkansas.com/map?lat=${lat}&lng=${lon}&zoom=15" target="_blank" class="btn btn-sm btn-outline-neon">View</a>`
            : '--';
        
        return `
            <tr>
                <td>
                    <button class="btn-ignore" onclick="ignoreId('${id}')" title="Ignore">
                        <i class="bi bi-eye-slash"></i>
                    </button>
                </td>
                <td>${county}</td>
                <td><span class="incident-type ${getIncidentTypeClass(type)}">${type}</span></td>
                <td>${route}</td>
                <td title="${description}">${description.substring(0, 60)}${description.length > 60 ? '...' : ''}</td>
                <td>${lanes}</td>
                <td>${cameraText}</td>
                <td>${mapLink}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Ignore an incident by ID
 */
function ignoreId(id) {
    const idStr = String(id);
    if (!state.ignoredIds.includes(idStr)) {
        state.ignoredIds.push(idStr);
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

/**
 * Toggle autoplay sound
 */
function autoPlay() {
    const checkbox = document.getElementById('autoPlayCheck');
    state.autoPlaySound = checkbox ? checkbox.checked : false;
    
    const btn = document.getElementById('soundToggle');
    const icon = btn?.querySelector('i');
    
    if (icon) {
        icon.className = state.autoPlaySound ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
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
// Map Functions (OpenLayers)
// ================================================

let map = null;
let incidentLayer = null;

function initMap() {
    const incidentSource = new ol.source.Vector();
    
    incidentLayer = new ol.layer.Vector({
        source: incidentSource,
        style: function(feature) {
            const type = feature.get('type') || '';
            let color = '#607d8b';
            
            if (type.toLowerCase().includes('crash') || type.toLowerCase().includes('accident')) color = '#f44336';
            else if (type.toLowerCase().includes('construction')) color = '#ff9800';
            else if (type.toLowerCase().includes('closure')) color = '#9c27b0';
            else if (type.toLowerCase().includes('weather')) color = '#2196f3';
            
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 8,
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            });
        }
    });
    
    map = new ol.Map({
        target: 'incidentMap',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                    attributions: '© CARTO'
                })
            }),
            incidentLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([CONFIG.HOME_LOCATION.lon, CONFIG.HOME_LOCATION.lat]),
            zoom: 9
        }),
        controls: ol.control.defaults.defaults().extend([new ol.control.ScaleLine()])
    });
    
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
        if (feature) {
            alert(`${feature.get('description')}\n\n${feature.get('location') || ''}`);
        }
    });
}

function updateMap(events) {
    if (!incidentLayer) return;
    
    const source = incidentLayer.getSource();
    source.clear();
    
    events.forEach(event => {
        const lat = event.latitude || event.lat;
        const lon = event.longitude || event.lon || event.lng;
        
        if (!lat || !lon) return;
        
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
            type: event.type || event.event_type || 'Unknown',
            description: event.description || event.headline || 'No description',
            location: event.route || event.road_name || ''
        });
        
        source.addFeature(feature);
    });
}

// ================================================
// Tab Switching
// ================================================

function initTabs() {
    document.querySelectorAll('.panel-tabs').forEach(tabContainer => {
        const panel = tabContainer.closest('.grid-panel');
        const tabs = tabContainer.querySelectorAll('.tab-btn');
        const contents = panel.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab + '-tab';
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
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
// Refresh Functions
// ================================================

function refreshAll() {
    state.refreshCountdown = 300;
    getWeather();
    doTheThing();
    getCameraCount();
    
    const btn = document.getElementById('refreshAllBtn');
    if (btn) {
        btn.classList.add('rotating');
        setTimeout(() => btn.classList.remove('rotating'), 1000);
    }
}

// ================================================
// Event Listeners
// ================================================

function initEventListeners() {
    // Bridge filter checkbox
    const bridgeCheck = document.getElementById('bridgeCheck');
    if (bridgeCheck) {
        bridgeCheck.addEventListener('change', doTheThing);
    }
    
    // Refresh incidents button
    const refreshBtn = document.getElementById('refreshIncidents');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', doTheThing);
    }
    
    // Clear ignored button
    const clearBtn = document.getElementById('clearIgnored');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearIgnored);
    }
    
    // Refresh all button
    const refreshAllBtn = document.getElementById('refreshAllBtn');
    if (refreshAllBtn) {
        refreshAllBtn.addEventListener('click', refreshAll);
    }
    
    // Sound toggle button
    const soundBtn = document.getElementById('soundToggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            const checkbox = document.getElementById('autoPlayCheck');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                autoPlay();
            }
        });
    }
    
    // Autoplay checkbox
    const autoPlayCheck = document.getElementById('autoPlayCheck');
    if (autoPlayCheck) {
        autoPlayCheck.addEventListener('change', autoPlay);
    }
}

// ================================================
// Initialization
// ================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('NWA Grid Dashboard initializing...');
    console.log('Rework of Cameron Wilson\'s airtrak.me Site by Maximiliano Garcia');
    
    initEventListeners();
    initTabs();
    initMap();
    
    getCameraCount(true);
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
