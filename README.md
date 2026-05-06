# Weather-app
Simple weather app with Js and HTML

CHECK OUT THE ORIGINAL SOURCE CODE HERE:
https://codepen.io/MiguelEnc/pen/vmZVar
Credits to him!! :)

 Key Capabilities

*   Global Meteorological Data - Integrates with the OpenWeatherMap API for accurate, real-time updates
*   Dual-Unit Support - Seamlessly toggle between Metric (°C) and Imperial (°F) systems
*   Adaptive UI - Dynamic, weather-based background animations that synchronize with current environmental conditions
*   Contextual Messaging - Intelligent, weather-specific status updates and random trivia (30% occurrence rate)
*   Persistent Configuration - Utilizes local storage to maintain user preferences, including last-searched location and display mode
*   System Aesthetics - Built-in Dark Mode support and responsive design for cross-platform compatibility


Implementation Guide

 1. API Integration
To initialize data fetching, obtain a free API key from the [OpenWeatherMap API Portal](https -//openweathermap.org/api).
 3. Configuration
Navigate to `js/app.js` and update the authentication constant -

```javascript
//Replace with your unique API key
const API_KEY = "YOUR_ACTUAL_API_KEY_HERE";
