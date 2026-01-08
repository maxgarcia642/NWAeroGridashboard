# NWA Grid Dashboard

A modern single-page dashboard remake of the NWA (Northwest Arkansas) tracker featuring a **vaporwave weather channel style** aesthetic. This dashboard provides real-time weather data, traffic incidents, plane tracking, and severe weather monitoring all in one responsive, dark-mode interface.

![Dashboard Preview](https://img.shields.io/badge/Style-Vaporwave-ff6ec7?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live-00f5ff?style=for-the-badge)

## Features

### 🌡️ Local Weather
- Real-time weather data from **NWS API** (KASG - Springdale, AR)
- Temperature, dewpoint (with comfort color-coding), wind speed/gusts, humidity
- Automatic 5-minute refresh
- SPC Day 1 Outlook image

### 🚗 iDriveArkansas Integration
- Live traffic incident monitoring
- Filterable incident table with distance calculations
- Interactive OpenLayers map with incident markers
- Camera count display
- Ignore/hide individual incidents

### ✈️ ADS-B Plane Tracker
- Embedded ADS-B Exchange globe viewer
- Real-time aircraft tracking for NWA region

### 🌀 Radar & Weather Products
- **NWS Radar** - KSRX (Fort Smith) radar imagery
- **College of DuPage** - Advanced radar products
- **Pivotal Weather** - HRRR model radar

### 📊 Soundings & Models
- NWS/SPC Soundings viewer
- COD Forecast models
- SPC Products page

### 🔗 Quick Links
- iDriveArkansas, ADS-B Exchange, NWS Tulsa
- Nadocast, SPC, NHC
- Pivotal Weather, COD Weather
- Storm Streams

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom vaporwave styling with CSS Grid
- **JavaScript (ES6+)** - Vanilla JS with async/await
- **Bootstrap 5** - Responsive grid and dark mode
- **OpenLayers 7** - Interactive mapping
- **Bootstrap Icons** - Icon library

## Vaporwave Aesthetic

The dashboard features a carefully crafted vaporwave color palette:
- 🔮 Neon pink (`#ff6ec7`)
- 💎 Neon cyan (`#00f5ff`)
- 💜 Neon purple (`#bf00ff`)
- 🌅 Sunset gradients
- 📺 Retro scanline overlay effect
- ✨ Glowing borders and text

## Getting Started

### Quick Start

1. Clone the repository:
```bash
git clone <repo-url>
cd nwa-grid-dashboard
```

2. Serve the files locally:
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve -l 3000

# Or simply open index.html in a browser
```

3. Open your browser to `http://localhost:8000` (or `http://localhost:3000`)

### File Structure

```
nwa-grid-dashboard/
├── index.html      # Main dashboard HTML
├── style.css       # Vaporwave CSS styles
├── weather.js      # Dashboard logic & API calls
├── package.json    # Project metadata
├── README.md       # This file
└── LICENSE         # MIT License
```

## API Dependencies

This dashboard relies on public APIs:

| API | Purpose | Rate Limits |
|-----|---------|-------------|
| [NWS API](https://api.weather.gov) | Weather observations | Free, public |
| [iDriveArkansas](https://www.idrivearkansas.com) | Traffic incidents & cameras | Public access |
| [ADS-B Exchange](https://globe.adsbexchange.com) | Aircraft tracking (iframe) | Embedded widget |

## Configuration

Modify `weather.js` to customize:

```javascript
const CONFIG = {
    NWS_STATION: 'KASG',        // Change weather station
    HOME_LOCATION: {             // Change center location
        lat: 36.1867,
        lon: -94.1288
    },
    REFRESH_WEATHER: 5 * 60 * 1000,  // Adjust refresh intervals
    // ...
};
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Responsive Design

The dashboard is fully responsive:
- **Desktop** (1200px+): 2-column grid layout
- **Tablet** (768px-1200px): Single-column layout
- **Mobile** (<768px): Optimized touch-friendly layout

## Auto-Refresh Schedule

| Data | Interval |
|------|----------|
| Weather | 5 minutes |
| Incidents | 30 seconds |
| Cameras | 10 minutes |
| Clock | 1 second |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [National Weather Service](https://www.weather.gov) for weather data
- [iDriveArkansas](https://www.idrivearkansas.com) for traffic data
- [ADS-B Exchange](https://www.adsbexchange.com) for aircraft tracking
- [OpenLayers](https://openlayers.org) for mapping
- [Bootstrap](https://getbootstrap.com) for UI components

---

**Built with 💜 for Northwest Arkansas**
