/* ============================================================
   NIMBUS — Weather App  |  script.js
   ============================================================ */

/* ------------------------------------------------------------------
   🔑 API KEY — PASTE YOUR KEY HERE
   Get one free at: https://openweathermap.org/api
   1. Sign up at openweathermap.org
   2. Go to your profile → "My API keys"
   3. Copy the key and paste it below
   ------------------------------------------------------------------ */
const API_KEY = 'YOUR_API_KEY_HERE';

const BASE_URL  = 'https://api.openweathermap.org/data/2.5';
const ICON_URL  = 'https://openweathermap.org/img/wn';

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */
let currentUnit  = 'C';           // 'C' | 'F'
let lastWeather  = null;          // raw API response cache
let lastForecast = null;

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                         */
/* ------------------------------------------------------------------ */
const $  = id => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

/* ------------------------------------------------------------------ */
/*  Unit helpers                                                        */
/* ------------------------------------------------------------------ */
function toDisplay(tempK) {
  // OWM returns Kelvin when using 'standard'; we request metric so it's °C
  // tempK here is actually °C already (from metric API call)
  return currentUnit === 'C'
    ? Math.round(tempK)
    : Math.round(tempK * 9 / 5 + 32);
}

function unitSymbol() { return `°${currentUnit}`; }

function windDisplay(mps) {
  // mps = metres per second (metric)
  return currentUnit === 'C'
    ? `${Math.round(mps * 3.6)} km/h`
    : `${Math.round(mps * 2.237)} mph`;
}

/* ------------------------------------------------------------------ */
/*  Unit Toggle                                                         */
/* ------------------------------------------------------------------ */
function setUnit(unit) {
  if (unit === currentUnit) return;
  currentUnit = unit;
  $('btnC').classList.toggle('active', unit === 'C');
  $('btnF').classList.toggle('active', unit === 'F');
  if (lastWeather && lastForecast) renderAll(lastWeather, lastForecast);
}

/* ------------------------------------------------------------------ */
/*  Search / Enter key                                                  */
/* ------------------------------------------------------------------ */
$('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

async function handleSearch() {
  const city = $('searchInput').value.trim();
  if (!city) return;
  await fetchWeather(city);
}

/* ------------------------------------------------------------------ */
/*  API Fetch                                                           */
/* ------------------------------------------------------------------ */
async function fetchWeather(city) {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('⚠ No API key found. Open script.js and replace YOUR_API_KEY_HERE with your OpenWeatherMap key.');
    return;
  }

  showLoader();
  hideError();
  hideMain();

  try {
    // 1. Current weather
    const weatherRes = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );

    if (!weatherRes.ok) {
      if (weatherRes.status === 404) throw new Error('City not found. Check the spelling and try again.');
      if (weatherRes.status === 401) throw new Error('Invalid API key. Please check your key in script.js.');
      throw new Error(`Weather service error (${weatherRes.status}). Please try again.`);
    }

    const weatherData = await weatherRes.json();

    // 2. 5-day / 3-hour forecast
    const forecastRes = await fetch(
      `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );

    if (!forecastRes.ok) throw new Error('Failed to fetch forecast data.');

    const forecastData = await forecastRes.json();

    lastWeather  = weatherData;
    lastForecast = forecastData;

    hideLoader();
    renderAll(weatherData, forecastData);
    showMain();

  } catch (err) {
    hideLoader();
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

/* ------------------------------------------------------------------ */
/*  Master Render                                                       */
/* ------------------------------------------------------------------ */
function renderAll(w, f) {
  renderHero(w);
  renderHourly(f);
  renderForecast(f);
  renderExtras(w);
}

/* ------------------------------------------------------------------ */
/*  Hero / Current Weather                                              */
/* ------------------------------------------------------------------ */
function renderHero(w) {
  // Location & time
  $('cityName').textContent    = w.name;
  $('countryName').textContent = w.sys.country;
  $('currentDate').textContent = formatDate(new Date());

  // Condition
  const icon = w.weather[0].icon;
  $('conditionIcon').src = `${ICON_URL}/${icon}@2x.png`;
  $('conditionIcon').alt = w.weather[0].description;
  $('conditionText').textContent = w.weather[0].description;

  // Temperatures
  $('tempVal').textContent  = toDisplay(w.main.temp);
  $('tempUnit').textContent = unitSymbol();
  $('tempHi').textContent   = `↑ ${toDisplay(w.main.temp_max)}${unitSymbol()}`;
  $('tempLo').textContent   = `↓ ${toDisplay(w.main.temp_min)}${unitSymbol()}`;
  $('feelsLike').textContent = `${toDisplay(w.main.feels_like)}${unitSymbol()}`;

  // Meta
  $('humidity').textContent   = `${w.main.humidity}%`;
  $('windSpeed').textContent  = windDisplay(w.wind.speed);
  $('visibility').textContent = w.visibility ? `${(w.visibility / 1000).toFixed(1)} km` : 'N/A';

  // Sun times
  $('sunrise').textContent = formatTime(w.sys.sunrise * 1000);
  $('sunset').textContent  = formatTime(w.sys.sunset  * 1000);
}

/* ------------------------------------------------------------------ */
/*  Hourly Forecast (next 24 hrs — 8 entries × 3h)                    */
/* ------------------------------------------------------------------ */
function renderHourly(f) {
  const track = $('hourlyTrack');
  track.innerHTML = '';
  const items = f.list.slice(0, 8);
  const nowHour = new Date().getHours();

  items.forEach((item, i) => {
    const dt   = new Date(item.dt * 1000);
    const hour = dt.getHours();
    const isNow = i === 0;

    const card = el('div', `hourly-item${isNow ? ' now' : ''}`);
    card.innerHTML = `
      <span class="hourly-time">${isNow ? 'Now' : formatHour(dt)}</span>
      <img class="hourly-icon"
           src="${ICON_URL}/${item.weather[0].icon}.png"
           alt="${item.weather[0].description}"
      />
      <span class="hourly-temp">${toDisplay(item.main.temp)}${unitSymbol()}</span>
      ${item.pop > 0 ? `<span class="hourly-pop">💧 ${Math.round(item.pop * 100)}%</span>` : ''}
    `;

    // stagger animation
    card.style.opacity  = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `all 0.4s ease ${i * 0.06}s`;
    track.appendChild(card);

    requestAnimationFrame(() => {
      card.style.opacity   = '1';
      card.style.transform = 'translateY(0)';
    });
  });
}

/* ------------------------------------------------------------------ */
/*  5-Day Forecast                                                      */
/* ------------------------------------------------------------------ */
function renderForecast(f) {
  const grid = $('forecastGrid');
  grid.innerHTML = '';

  // Group by day; take midday reading when available
  const days = {};
  f.list.forEach(item => {
    const d   = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  // Build one entry per day (skip today)
  const dayKeys = Object.keys(days).slice(1, 6);

  dayKeys.forEach((key, i) => {
    const readings  = days[key];
    // pick midday (~12pm) or first available
    const midday    = readings.find(r => new Date(r.dt * 1000).getHours() === 12) || readings[0];
    const temps     = readings.map(r => r.main.temp);
    const hi        = Math.max(...temps);
    const lo        = Math.min(...temps);

    const card = el('div', 'forecast-item glass');
    card.innerHTML = `
      <span class="forecast-day">${formatDay(new Date(midday.dt * 1000))}</span>
      <img class="forecast-icon"
           src="${ICON_URL}/${midday.weather[0].icon}@2x.png"
           alt="${midday.weather[0].description}"
      />
      <span class="forecast-desc">${midday.weather[0].description}</span>
      <div class="forecast-temps">
        <span class="f-hi">${toDisplay(hi)}${unitSymbol()}</span>
        <span class="f-lo">${toDisplay(lo)}${unitSymbol()}</span>
      </div>
    `;

    card.style.opacity    = '0';
    card.style.transform  = 'translateY(16px)';
    card.style.transition = `all 0.45s ease ${i * 0.08}s`;
    grid.appendChild(card);

    requestAnimationFrame(() => {
      card.style.opacity   = '1';
      card.style.transform = 'translateY(0)';
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Extra Stats (Pressure, Cloudiness, Wind Dir)                       */
/* ------------------------------------------------------------------ */
function renderExtras(w) {
  // Pressure (standard sea-level: ~1013 hPa; range 950–1050)
  const pres = w.main.pressure;
  $('pressure').textContent = pres;
  const pressPct = Math.min(100, Math.max(0, ((pres - 950) / 100) * 100));
  $('pressureBar').style.width = `${pressPct}%`;

  // Cloudiness
  const clouds = w.clouds.all;
  $('cloudiness').textContent = clouds;
  $('cloudinessBar').style.width = `${clouds}%`;

  // Wind direction
  const deg = w.wind.deg || 0;
  $('windDir').textContent = deg;
  $('compassNeedle').style.transform = `rotate(${deg}deg)`;
}

/* ------------------------------------------------------------------ */
/*  UI State Management                                                 */
/* ------------------------------------------------------------------ */
function showLoader()  { $('loader').classList.add('visible'); }
function hideLoader()  { $('loader').classList.remove('visible'); }
function showMain()    { $('mainContent').classList.add('visible'); }
function hideMain()    { $('mainContent').classList.remove('visible'); }
function hideError()   { $('errorWrap').classList.remove('visible'); }

function showError(msg) {
  $('errorMsg').textContent = msg;
  $('errorWrap').classList.add('visible');
}

function clearError() {
  hideError();
  $('searchInput').focus();
}

/* ------------------------------------------------------------------ */
/*  Date / Time Formatters                                              */
/* ------------------------------------------------------------------ */
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatHour(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

function formatDay(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/* ------------------------------------------------------------------ */
/*  Animated Particle Background                                        */
/* ------------------------------------------------------------------ */
(function initCanvas() {
  const canvas = $('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.x    = Math.random() * W;
      this.y    = init ? Math.random() * H : H + 10;
      this.r    = Math.random() * 1.5 + 0.4;
      this.vy   = -(Math.random() * 0.4 + 0.1);
      this.vx   = (Math.random() - 0.5) * 0.2;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.life  = 0;
      this.maxLife = Math.random() * 400 + 200;
    }

    update() {
      this.x    += this.vx;
      this.y    += this.vy;
      this.life++;
      const fade = this.life / this.maxLife;
      this.alpha = (1 - fade) * 0.45 + 0.05;
      if (this.y < -10 || this.life > this.maxLife) this.reset();
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(140,180,255,${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  loop();
})();

/* ------------------------------------------------------------------ */
/*  Load default city on startup                                        */
/* ------------------------------------------------------------------ */
window.addEventListener('DOMContentLoaded', () => {
  // Optionally: comment this out to show blank state on load
  fetchWeather('London');
});