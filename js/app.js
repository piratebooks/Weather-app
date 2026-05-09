var unitIsCelcius = true;
var globalForecast = [];
var lat, lon;
var currentTimezone = null;
var clockInterval;
var currentFocus = -1;
var autocompleteTimeout;

// Geoapify API key (replace with your actual key)
const GEOAPIFY_API_KEY = "0d30662c71064dfe8045d568a7b6afc7";
// Maps Open-Meteo weather codes to Weather Icons
var weatherIconsMap = {
    0: "wi-day-sunny", // Clear sky
    1: "wi-day-cloudy", // Mainly clear
    2: "wi-day-cloudy", // Partly cloudy
    3: "wi-cloudy", // Overcast
    45: "wi-fog", // Fog
    48: "wi-fog", // Depositing rime fog
    51: "wi-showers", // Drizzle: Light
    53: "wi-showers", // Drizzle: Moderate
    55: "wi-showers", // Drizzle: Dense
    56: "wi-day-hail", // Freezing Drizzle: Light
    57: "wi-day-hail", // Freezing Drizzle: Dense
    61: "wi-rain", // Rain: Slight
    63: "wi-rain", // Rain: Moderate
    65: "wi-rain", // Rain: Heavy
    66: "wi-day-hail", // Freezing Rain: Light
    67: "wi-day-hail", // Freezing Rain: Heavy
    71: "wi-snow", // Snow fall: Slight
    73: "wi-snow", // Snow fall: Moderate
    75: "wi-snow", // Snow fall: Heavy
    77: "wi-snow", // Snow grains
    80: "wi-showers", // Rain showers: Slight
    81: "wi-showers", // Rain showers: Moderate
    82: "wi-showers", // Rain showers: Violent
    85: "wi-snow", // Snow showers slight
    86: "wi-snow", // Snow showers heavy
    95: "wi-thunderstorm", // Thunderstorm: Slight or moderate
    96: "wi-thunderstorm", // Thunderstorm with slight hail
    99: "wi-thunderstorm" // Thunderstorm with heavy hail
};

// Maps weather codes to descriptions
var weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
};

$(function () {
    getClientPosition();
    startClock(currentTimezone); // Start with no timezone, will update when city is loaded
    initSearch();
    initDarkMode();
});

function startClock(timezone) {
    // Clear previous interval if it exists
    if (clockInterval) clearInterval(clockInterval);
    
    clockInterval = setInterval(function () {
        var now = new Date();
        var timeString;
        
        if (timezone) {
            // Display time in the searched city's timezone
            try {
                timeString = now.toLocaleString('en-US', { 
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            } catch (e) {
                // Fallback if timezone is invalid
                timeString = now.toLocaleTimeString();
            }
        } else {
            // Display browser's local time if no timezone provided
            timeString = now.toLocaleTimeString();
        }
        
        $("#localTime").text(timeString);
    }, 1000);
}

function getClientPosition() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            
            // Use reverse geocoding to get city name
            $.ajax({
                url: "https://api.geoapify.com/v1/geocode/reverse",
                data: {
                    lat: lat,
                    lon: lon,
                    apiKey: GEOAPIFY_API_KEY,
                    format: "json"
                },
                success: function (data) {
                    var result = (data.features && data.features.length > 0 ? data.features[0] :
                                (data.results && data.results.length > 0 ? data.results[0] : null));
                    if (result) {
                        var props = result.properties || result;
                        var city = props.city || props.town || props.village || props.name || "Unknown";
                        var country = props.country || "";
                        $("#cityName").text(city + ", ");
                        $("#cityCode").text(country);
                    } else {
                        $("#cityName").text("Current Location, ");
                        $("#cityCode").text("");
                    }
                    getWeatherData(lat, lon);
                },
                error: function (err) {
                    console.log("Reverse geocoding error", err);
                    $("#cityName").text("Current Location, ");
                    $("#cityCode").text("");
                    getWeatherData(lat, lon);
                }
            });
        }, function(error) {
            console.log("Geolocation error:", error);
            // Fallback to a default location (London) if geolocation fails
            lat = 51.5074;
            lon = -0.1278;
            $("#cityName").text("London, ");
            $("#cityCode").text("GB");
            getWeatherData(lat, lon);
        });
    } else {
        console.log("Geolocation not supported");
        // Fallback to a default location
        lat = 51.5074;
        lon = -0.1278;
        $("#cityName").text("London, ");
        $("#cityCode").text("GB");
        getWeatherData(lat, lon);
    }
}

function initSearch() {
    $("#cityInput").on("input", function () {
        var query = $(this).val().trim();
        clearTimeout(autocompleteTimeout);
        if (query.length < 2) {
            hideAutocomplete();
            return;
        }
        autocompleteTimeout = setTimeout(function () {
            fetchCitySuggestions(query);
        }, 300);
    });

    $("#cityInput").on("keydown", function (e) {
        var dropdown = $("#autocompleteDropdown");
        var items = dropdown.find(".autocomplete-item");

        if (!dropdown.hasClass("show")) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            currentFocus = (currentFocus < items.length - 1) ? currentFocus + 1 : 0;
            setActiveItem(items);
            updateInputToHighlighted(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            currentFocus = (currentFocus > 0) ? currentFocus - 1 : items.length - 1;
            setActiveItem(items);
            updateInputToHighlighted(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (currentFocus > -1) {
                items.eq(currentFocus).click();
            } else {
                getWeatherByCity($("#cityInput").val());
            }
        } else if (e.key === "Escape") {
            hideAutocomplete();
        }
    });

    $("#searchBtn").on("click", function () {
        getWeatherByCity($("#cityInput").val());
    });

    $(document).on("click", function (e) {
        if (!$(e.target).closest(".search-container").length) {
            hideAutocomplete();
        }
    });
}

function fetchCitySuggestions(query) {
    $.ajax({
        url: "https://api.geoapify.com/v1/geocode/search",
        data: {
            text: query,
            apiKey: GEOAPIFY_API_KEY,
            limit: 5,
            format: "json"
        },
        success: function (data) {
            showAutocomplete(data.features || data.results || []);
        },
        error: function (err) {
            console.log("Geocoding error", err);
            hideAutocomplete();
        }
    });
}

function showAutocomplete(cities) {
    var dropdown = $("#autocompleteDropdown");
    dropdown.empty();
    if (cities.length === 0) {
        hideAutocomplete();
        return;
    }

    cities.forEach(function (city) {
        var props = city.properties || city;
        var displayName = props.formatted || props.city || props.name || "";
        var shortName = props.city || (displayName.split(',')[0] || "");
        var country = props.country || "";
        var state = props.state || "";
        var latValue = city.geometry ? city.geometry.coordinates[1] : city.lat;
        var lonValue = city.geometry ? city.geometry.coordinates[0] : city.lon;
        
        var display = shortName + (state ? ", " + state : "") + (country ? ", " + country : "");
        
        var item = $('<div class="autocomplete-item"></div>');
        item.html('<span>' + shortName + '</span><span class="city-country">' + (state || country) + '</span>');
        item.on("click", function () {
            $("#cityInput").val(display);
            hideAutocomplete();
            getWeatherByCity(display, latValue, lonValue);
        });
        dropdown.append(item);
    });
    dropdown.addClass("show");
    currentFocus = -1;
}

function hideAutocomplete() {
    $("#autocompleteDropdown").removeClass("show");
    currentFocus = -1;
}

function setActiveItem(items) {
    items.removeClass("active");
    if (currentFocus > -1) items.eq(currentFocus).addClass("active");
}

function updateInputToHighlighted(items) {
    if (currentFocus > -1) {
        var text = items.eq(currentFocus).find('span:first').text();
        var country = items.eq(currentFocus).find('.city-country').text();
        $("#cityInput").val(text + ", " + country);
    }
}

function getWeatherByCity(city, providedLat, providedLon) {
    if (!city) return;
    
    // If lat/lon provided (from autocomplete), use them directly
    if (providedLat && providedLon) {
        lat = parseFloat(providedLat);
        lon = parseFloat(providedLon);
        $("#cityName").text(city.split(',')[0] + ", ");
        $("#cityCode").text(city.split(',').pop().trim());
        getWeatherData(lat, lon);
        return;
    }
    
    // Otherwise, geocode the city name first
    $.ajax({
        url: "https://api.geoapify.com/v1/geocode/search",
        data: {
            text: city,
            apiKey: GEOAPIFY_API_KEY,
            limit: 1,
            format: "json"
        },
        success: function (data) {
            var feature = (data.features && data.features.length > 0 ? data.features[0] :
                          (data.results && data.results.length > 0 ? data.results[0] : null));
            if (feature) {
                lat = parseFloat(feature.geometry ? feature.geometry.coordinates[1] : feature.lat);
                lon = parseFloat(feature.geometry ? feature.geometry.coordinates[0] : feature.lon);
                var props = feature.properties || feature;
                var cityName = props.city || props.name || city.split(',')[0];
                var country = props.country || "";
                $("#cityName").text(cityName + ", ");
                $("#cityCode").text(country);
                getWeatherData(lat, lon);
            } else {
                console.log("City not found");
            }
        },
        error: function (err) {
            console.log("Geocoding error", err);
        }
    });
}

function getWeatherData(latitude, longitude) {
    if (latitude === undefined) latitude = lat;
    if (longitude === undefined) longitude = lon;

    $.ajax({
        type: "GET",
        url: "https://api.open-meteo.com/v1/forecast",
        data: {
            latitude: latitude,
            longitude: longitude,
            daily: "temperature_2m_max,temperature_2m_min,weathercode",
            hourly: "temperature_2m,relative_humidity_2m,windspeed_10m",
            timezone: "auto",
            forecast_days: 5
        },
        success: function (data) {
            // Store timezone and restart clock with city's timezone
            currentTimezone = data.timezone;
            startClock(data.timezone);
            processOpenMeteoData(data);
            $("#refreshButton").html("<i class='fa fa-refresh fa-fw'></i> Refresh");
        },
        error: function (err) {
            console.log("Weather data error", err);
        }
    });
}

function processOpenMeteoData(data) {
    var dailyData = [];
    
    // Process daily data
    for (var i = 0; i < data.daily.time.length; i++) {
        var date = new Date(data.daily.time[i]);
        var weatherCode = data.daily.weathercode[i];
        
        // Get current day's hourly data for additional info
        var dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        var dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        var dayTemps = [];
        var dayHumidity = [];
        var dayWind = [];
        
        for (var h = 0; h < data.hourly.time.length; h++) {
            var hourDate = new Date(data.hourly.time[h]);
            if (hourDate >= dayStart && hourDate <= dayEnd) {
                dayTemps.push(data.hourly.temperature_2m[h]);
                dayHumidity.push(data.hourly.relative_humidity_2m[h]);
                dayWind.push(data.hourly.windspeed_10m[h]);
            }
        }
        
        var avgTemp = dayTemps.reduce((a, b) => a + b, 0) / dayTemps.length;
        var avgHumidity = dayHumidity.reduce((a, b) => a + b, 0) / dayHumidity.length;
        var avgWind = dayWind.reduce((a, b) => a + b, 0) / dayWind.length;
        
        dailyData.push({
            dt: date.getTime() / 1000,
            temp: { 
                day: avgTemp, 
                min: data.daily.temperature_2m_min[i], 
                max: data.daily.temperature_2m_max[i] 
            },
            humidity: Math.round(avgHumidity),
            speed: avgWind,
            weather: [{
                main: getWeatherMainFromCode(weatherCode),
                description: weatherDescriptions[weatherCode] || "Unknown",
                icon: weatherCode.toString()
            }]
        });
    }
    
    globalForecast = { list: dailyData };
    updateForecast(globalForecast);
}

function getWeatherMainFromCode(code) {
    if (code === 0 || code === 1) return "Clear";
    if (code === 2 || code === 3) return "Clouds";
    if (code >= 45 && code <= 48) return "Fog";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain";
    if (code >= 85 && code <= 86) return "Snow";
    if (code >= 95) return "Thunderstorm";
    return "Unknown";
}

function updateForecast(forecast) {
    var today = forecast.list[0];
    $("#tempDescription").text(toCamelCase(today.weather[0].description));
    $("#humidity").text(today.humidity + "%");
    $("#wind").text(Math.round(today.speed * 10) / 10 + " km/h"); // Convert m/s to km/h for display
    $("#localDate").text(getFormattedDate(today.dt));
    $("#main-icon").attr("class", "wi " + weatherIconsMap[today.weather[0].icon]);

    var renderTemp = function (val) { return unitIsCelcius ? Math.round(val) : toFerenheit(val); };
    $("#mainTemperature").text(renderTemp(today.temp.day) + "°");
    $("#mainTempHot").text(renderTemp(today.temp.max) + "°");
    $("#mainTempLow").text(renderTemp(today.temp.min) + "°");

    updateBackground(today.weather[0].main);

    for (var i = 1; i < Math.min(forecast.list.length, 5); i++) {
        var day = forecast.list[i];
        $("#forecast-day-" + i + "-name").text(getFormattedDate(day.dt).substring(0, 3));
        $("#forecast-day-" + i + "-icon").attr("class", "wi forecast-icon " + weatherIconsMap[day.weather[0].icon]);
        $("#forecast-day-" + i + "-main").text(renderTemp(day.temp.day) + "°");
        $("#forecast-day-" + i + "-ht").text(renderTemp(day.temp.max) + "°");
        $("#forecast-day-" + i + "-lt").text(renderTemp(day.temp.min) + "°");
    }
}

$("#refreshButton").on("click", function (e) {
    e.preventDefault();
    $("#refreshButton").html("<i class='fa fa-refresh fa-spin fa-fw'></i>");
    getWeatherData();
});

$("#celcius, #farenheit").on("click", function (e) {
    e.preventDefault();
    var isCelcius = $(this).attr("id") === "celcius";
    if (unitIsCelcius !== isCelcius) {
        unitIsCelcius = isCelcius;
        $("#celcius, #farenheit").removeClass("active");
        $(this).addClass("active");
        updateForecast(globalForecast);
    }
});

function updateBackground(weatherMain) {
    var body = $("body");
    body.removeClass("weather-sunny weather-cloudy weather-rainy weather-snowy weather-windy");
    var w = weatherMain.toLowerCase();
    if (w.includes("clear")) body.addClass("weather-sunny");
    else if (w.includes("cloud")) body.addClass("weather-cloudy");
    else if (w.includes("rain") || w.includes("drizzle") || w.includes("thunder")) body.addClass("weather-rainy");
    else if (w.includes("snow")) body.addClass("weather-snowy");
    else body.addClass("weather-windy");
}

function getFormattedDate(date) {
    return new Date(date * 1000).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toCamelCase(str) {
    return str.split(" ").map(function (w) { return w.charAt(0).toUpperCase() + w.substring(1); }).join(" ");
}

function toFerenheit(val) { return Math.round((val * 1.8) + 32); }

function initDarkMode() {
    var darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
        $("body").addClass("dark-mode");
        $("#darkModeToggle").text("🌙");
    } else {
        $("#darkModeToggle").text("☀️");
    }

    $("#darkModeToggle").on("click", function() {
        $("body").toggleClass("dark-mode");
        var isDark = $("body").hasClass("dark-mode");
        $(this).text(isDark ? "🌙" : "☀️");
        localStorage.setItem("darkMode", isDark);
    });
}