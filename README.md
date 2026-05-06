 Weather App 

A feature-rich, interactive weather application providing real-time meteorological data with a focus on user engagement through dynamic UI elements and personalized feedback.


 Key Capabilities

*   Global Meteorological Data - Integrates with the Geocoding API and the free open-meteo.org for accurate, real-time updates.
*   Dual-Unit Support - Seamlessly toggle between Metric (°C) and Imperial (°F) systems.
*   Adaptive UI - Dynamic, weather-based background animations that synchronize with current environmental conditions.
*   Persistent Configuration - Utilizes local storage to maintain user preferences, including last-searched location and display mode.
*   System Aesthetics - Built-in Dark Mode support and responsive design for cross-platform compatibility.


 Implementation Guide

 1. API Integration
To initialize data fetching, obtain a free API key from the https://www.geoapify.com/ website

 2. Configuration
Navigate to `js/app.js` and update the authentication constant -

```javascript
// Replace with your unique API key
const GEOAPIFY_API_KEY = "YOUR_ACTUAL_API_KEY_HERE";
```

 3. Deployment
Before deploying, ensure you have replaced the placeholder API key with your actual Geoapify API key. The app can be deployed as a static site to any web server or hosting service like GitHub Pages, Netlify, or Vercel.

