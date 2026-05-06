var unitIsCelcius = true;
var globalForecast = [];
var lat, lon;
var currentFocus = -1;
var autocompleteTimeout;
const API_KEY = "ADD HERE"; //ADD HERE your OpenWeatherMap API key

// Maps the API's icons to the ones from https://erikflowers.github.io/weather-icons/
var weatherIconsMap = {
    "01d": "wi-day-sunny",
    "01n": "wi-night-clear",
    "02d": "wi-day-cloudy",
    "02n": "wi-night-cloudy",
    "03d": "wi-cloud",
    "03n": "wi-cloud",
    "04d": "wi-cloudy",
    "04n": "wi-cloudy",
    "09d": "wi-showers",
    "09n": "wi-showers",
    "10d": "wi-day-hail",
    "10n": "wi-night-hail",
    "11d": "wi-thunderstorm",
    "11n": "wi-thunderstorm",
    "13d": "wi-snow",
    "13n": "wi-snow",
    "50d": "wi-fog",
    "50n": "wi-fog"
};

$(function () {
    getClientPosition();
    startClock();
    initSearch();
    initDarkMode();
});

function startClock() {
    setInterval(function () {
        $("#localTime").text(new Date().toLocaleTimeString());
    }, 1000);
}

function getClientPosition() {
    $.getJSON("https://ipapi.co/json/", function (position) {
        $("#cityName").text(position.city + ", ");
        $("#cityCode").text(position.country);
        lat = position.latitude;
        lon = position.longitude;
        getWeatherData(lat, lon);
    });
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
    $.getJSON("https://api.openweathermap.org/geo/1.0/direct?q=" + encodeURIComponent(query) + "&limit=5&appid=" + API_KEY, function (data) {
        showAutocomplete(data);
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
        var display = city.name + (city.state ? ", " + city.state : "") + ", " + city.country;
        var item = $('<div class="autocomplete-item"></div>');
        item.html('<span>' + city.name + '</span><span class="city-country">' + (city.state || city.country) + '</span>');
        item.on("click", function () {
            $("#cityInput").val(display);
            hideAutocomplete();
            getWeatherByCity(display);
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

function getWeatherByCity(city) {
    if (!city) return;
    $.ajax({
        type: "GET",
        url: "https://api.openweathermap.org/data/2.5/forecast?q=" + encodeURIComponent(city) + "&appid=" + API_KEY + "&units=metric",
        success: function (data) {
            $("#cityName").text(data.city.name + ", ");
            $("#cityCode").text(data.city.country);
            lat = data.city.coord.lat;
            lon = data.city.coord.lon;
            processForecastData(data);
        },
        error: function (err) {
            console.log("City not found", err);
        }
    });
}

function getWeatherData(latitude, longitude) {
    if (latitude === undefined) latitude = lat;
    if (longitude === undefined) longitude = lon;

    $.ajax({
        type: "GET",
        url: "https://api.openweathermap.org/data/2.5/forecast?APPID=" + API_KEY + "&lat=" + latitude + "&lon=" + longitude + "&units=metric",
        cache: true,
        success: function (data) {
            processForecastData(data);
            $("#refreshButton").html("<i class='fa fa-refresh fa-fw'></i> Refresh");
        }
    });
}

function processForecastData(data) {
    var dailyData = [];
    var currentDay = "";
    var tempDaily = null;

    data.list.forEach(function (item) {
        var date = new Date(item.dt * 1000).toDateString();
        if (date !== currentDay) {
            if (tempDaily) dailyData.push(tempDaily);
            currentDay = date;
            tempDaily = {
                dt: item.dt,
                temp: { day: item.main.temp, min: item.main.temp_min, max: item.main.temp_max },
                humidity: item.main.humidity,
                speed: item.wind.speed,
                weather: item.weather
            };
        } else {
            if (item.main.temp_min < tempDaily.temp.min) tempDaily.temp.min = item.main.temp_min;
            if (item.main.temp_max > tempDaily.temp.max) tempDaily.temp.max = item.main.temp_max;
        }
    });
    if (tempDaily) dailyData.push(tempDaily);
    globalForecast = { list: dailyData };
    updateForecast(globalForecast);
}

function updateForecast(forecast) {
    var today = forecast.list[0];
    $("#tempDescription").text(toCamelCase(today.weather[0].description));
    $("#humidity").text(today.humidity + "%");
    $("#wind").text(today.speed + " m/s");
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