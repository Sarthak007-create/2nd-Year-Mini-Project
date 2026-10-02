
// SkySense weather app
// Sarthak | JS mini project

const API_KEY    = "bb36788205c3999f044f625d81579156";
const OPENAI_KEY = "YOUR_OPENAI_API_KEY_HERE"; // replace with your key

let currentWeatherData = null;
let currentCondition   = "";
let isDarkMode         = false;

const weatherThemes = {
    thunderstorm: { bg: "linear-gradient(135deg,#0f0c29 0%,#302b63 55%,#24243e 100%)", b1:"#302b63", b2:"#0f0c29", b3:"#6a1a4a" },
    rain:         { bg: "linear-gradient(135deg,#1c3b4a 0%,#2d6a8a 55%,#1a2e40 100%)", b1:"#1a4a6b", b2:"#2d6a8a", b3:"#123248" },
    drizzle:      { bg: "linear-gradient(135deg,#2d5a6b 0%,#3d8a9a 55%,#1e4050 100%)", b1:"#2d5a6b", b2:"#3d8a9a", b3:"#1e4050" },
    snow:         { bg: "linear-gradient(135deg,#a8c5e8 0%,#d4e9f7 55%,#b8d4ee 100%)", b1:"#9bbede", b2:"#c4ddf0", b3:"#a8c5e8" },
    clear:        { bg: "linear-gradient(135deg,#1a6fc4 0%,#48b0ee 55%,#72d0f5 100%)", b1:"#1a6fc4", b2:"#48b0ee", b3:"#0e5aa3" },
    clouds:       { bg: "linear-gradient(135deg,#4b5e74 0%,#7a90a4 55%,#5e7488 100%)", b1:"#4b5e74", b2:"#8098ae", b3:"#3a4f62" },
    mist:         { bg: "linear-gradient(135deg,#5a5a6e 0%,#8a8a9e 55%,#6a6a7e 100%)", b1:"#5a5a6e", b2:"#8a8a9e", b3:"#4e4e60" },
    fog:          { bg: "linear-gradient(135deg,#5a5a6e 0%,#8a8a9e 55%,#6a6a7e 100%)", b1:"#5a5a6e", b2:"#8a8a9e", b3:"#4e4e60" },
    haze:         { bg: "linear-gradient(135deg,#6b6040 0%,#a09050 55%,#807040 100%)", b1:"#6b6040", b2:"#a09050", b3:"#504830" },
    default:      { bg: "linear-gradient(135deg,#1a6fc4 0%,#48b0ee 55%,#72d0f5 100%)", b1:"#1a6fc4", b2:"#48b0ee", b3:"#0e5aa3" }
};

const weatherEmojis = {
    thunderstorm:"⛈️", rain:"🌧️", drizzle:"🌦️",
    snow:"❄️", clear:"☀️", clouds:"☁️",
    mist:"🌫️", fog:"🌫️", haze:"🌫️"
};

function getWeather() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    showSpinner(true);
    hideError();

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`)
        .then(res => {
            if (!res.ok) throw new Error("not found");
            return res.json();
        })
        .then(data => {
            showSpinner(false);
            currentWeatherData = data;
            currentCondition   = data.weather[0].main.toLowerCase();

            renderCurrentWeather(data);
            applyWeatherTheme(currentCondition);
            updateHeroEmoji(currentCondition);
            setCurrentDate();

            document.getElementById("mainGrid").style.display = "flex";

            getAISuggestions(
                data.name,
                Math.round(data.main.temp),
                data.weather[0].description,
                data.main.humidity,
                data.wind.speed
            );

            getForecast(data.name);
        })
        .catch(err => {
            showSpinner(false);
            showError("City not found — check the spelling and try again.");
            console.error(err);
        });
}

function renderCurrentWeather(d) {
    document.getElementById("cityName").textContent     = d.name + ", " + d.sys.country;
    document.getElementById("temperature").textContent  = Math.round(d.main.temp) + "°";
    document.getElementById("weatherDesc").textContent  = capitalise(d.weather[0].description);
    document.getElementById("weatherIcon").src          = "https://openweathermap.org/img/wn/" + d.weather[0].icon + "@4x.png";
    document.getElementById("feelsLike").textContent    = "Feels " + Math.round(d.main.feels_like) + "°C";
    const vis = d.visibility ? (d.visibility / 1000).toFixed(1) + " km" : "—";
    document.getElementById("visibilityBadge").textContent = "Vis " + vis;
    document.getElementById("pressureBadge").textContent   = d.main.pressure + " hPa";
    document.getElementById("sunrise").textContent  = formatTime(d.sys.sunrise);
    document.getElementById("sunset").textContent   = formatTime(d.sys.sunset);
    document.getElementById("wind").textContent     = d.wind.speed + " m/s";
    document.getElementById("humidity").textContent = d.main.humidity + "%";

    const card = document.getElementById("weatherCard");
    card.classList.remove("card-enter");
    void card.offsetWidth;
    card.classList.add("card-enter");

    lucide.createIcons();
}

function setCurrentDate() {
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
}

function updateHeroEmoji(cond) {
    const el = document.getElementById("heroEmoji");
    el.textContent = weatherEmojis[cond] || "⛅";
    el.classList.remove("emoji-pop");
    void el.offsetWidth;
    el.classList.add("emoji-pop");
}

function applyWeatherTheme(cond) {
    if (isDarkMode) return;
    const t = weatherThemes[cond] || weatherThemes.default;
    document.getElementById("bgLayer").style.background = t.bg;
    document.querySelector(".blob1").style.background   = t.b1;
    document.querySelector(".blob2").style.background   = t.b2;
    document.querySelector(".blob3").style.background   = t.b3;
}

function getForecast(city) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`)
        .then(res => res.json())
        .then(data => renderForecast(data))
        .catch(err => console.error("forecast error:", err));
}

function renderForecast(data) {
    const section = document.getElementById("forecastSection");
    const track   = document.getElementById("forecast");

    // api gives every 3 hours — noon entry = one per day
    const days = data.list.filter(item => item.dt_txt.includes("12:00:00"));
    track.innerHTML = "";

    days.forEach((day, i) => {
        const date    = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString("en-US", { weekday:"short" });
        const dateStr = date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
        const icon    = `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;
        const desc    = capitalise(day.weather[0].description);

        const card = document.createElement("div");
        card.className = "fc-card";
        card.style.animationDelay = `${i * 0.09}s`;
        card.innerHTML = `
            <p class="fc-day">${dayName}</p>
            <p class="fc-date">${dateStr}</p>
            <img src="${icon}" class="fc-icon" alt="${desc}" />
            <p class="fc-temp">${Math.round(day.main.temp)}°C</p>
            <p class="fc-desc">${desc}</p>
            <p class="fc-range">↑${Math.round(day.main.temp_max)}° / ↓${Math.round(day.main.temp_min)}°</p>
            <div class="fc-meta">
                <span><i data-lucide="wind"></i>${day.wind.speed} m/s</span>
                <span><i data-lucide="droplets"></i>${day.main.humidity}%</span>
            </div>`;
        track.appendChild(card);
    });

    section.style.display = "block";
    lucide.createIcons();
}

async function getAISuggestions(city, temp, weather, humidity, wind) {
    const list    = document.getElementById("aiSuggestions");
    const loading = document.getElementById("aiLoading");
    const card    = document.getElementById("suggestionCard");

    list.innerHTML = "";
    loading.style.display = "flex";
    card.style.display    = "flex";

    const prompt =
        `Weather in ${city}: ${temp}°C, ${weather}, humidity ${humidity}%, wind ${wind} m/s.\n` +
        `Give exactly 5 practical tips as bullet points starting with a relevant emoji. ` +
        `Topics: clothing, accessories, activity, health, travel. Under 15 words each. Plain text only.`;

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + OPENAI_KEY
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role:"user", content:prompt }],
                max_tokens: 280,
                temperature: 0.75
            })
        });

        const data = await res.json();
        if (!data.choices || !data.choices[0]) throw new Error("bad response");

        loading.style.display = "none";
        data.choices[0].message.content
            .split("\n")
            .map(l => l.trim().replace(/^[-•*]\s*/, ""))
            .filter(l => l.length > 3)
            .slice(0, 5)
            .forEach((tip, i) => {
                const li = document.createElement("li");
                li.className = "sg-item";
                li.style.animationDelay = `${i * 0.09}s`;
                li.textContent = tip;
                list.appendChild(li);
            });
    } catch (err) {
        console.warn("OpenAI failed, using local tips:", err.message);
        loading.style.display = "none";
        const desc = currentWeatherData?.weather[0]?.description?.toLowerCase() || "";
        buildLocalTips(temp, desc, humidity, wind);
    }
}

function buildLocalTips(temp, desc, humidity, wind) {
    const list = document.getElementById("aiSuggestions");
    list.innerHTML = "";
    const tips = [];

    if      (temp >= 35) { tips.push("🥵 Wear light cotton — it's very hot outside."); tips.push("🕶️ Sunscreen SPF 50+ and sunglasses are essential."); tips.push("💧 Drink water constantly — heat exhaustion risk."); }
    else if (temp >= 28) { tips.push("☀️ Light T-shirt and shorts are perfect today."); tips.push("🧴 Apply sunscreen before heading outdoors."); }
    else if (temp >= 20) { tips.push("😊 Great weather — a casual outfit works well."); tips.push("🌬️ Bring a light jacket for the evening."); }
    else if (temp >= 12) { tips.push("🧥 A hoodie or mid-layer jacket is a good call."); tips.push("👟 Closed-toe shoes will keep your feet warm."); }
    else if (temp >= 5)  { tips.push("🧣 Layer up — scarf and warm jacket recommended."); tips.push("🧤 Gloves will help in temperatures this low."); }
    else                 { tips.push("🥶 Heavy coat, gloves and hat are necessary."); tips.push("❄️ Limit time outdoors — frostbite risk below 0°C."); }

    if (desc.includes("rain") || desc.includes("drizzle")) { tips.push("☂️ Carry an umbrella — rain expected today."); tips.push("👟 Waterproof footwear is strongly recommended."); }
    else if (desc.includes("thunder")) tips.push("⛈️ Thunderstorm alert — stay indoors if possible.");
    else if (desc.includes("snow"))    tips.push("❄️ Roads may be icy — drive slow and leave early.");
    else if (desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) tips.push("🌫️ Reduced visibility — use fog lights if driving.");
    else if (desc.includes("clear"))   tips.push("🌞 Perfect clear day — great for outdoor activities.");

    if (humidity > 80) tips.push("💦 High humidity — choose breathable cotton fabrics.");
    if (wind > 10)     tips.push("💨 Strong winds — secure loose items and hold your hat!");

    tips.slice(0, 5).forEach((tip, i) => {
        const li = document.createElement("li");
        li.className = "sg-item";
        li.style.animationDelay = `${i * 0.09}s`;
        li.textContent = tip;
        list.appendChild(li);
    });
}

document.getElementById("themeToggle").addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    const btn  = document.getElementById("themeToggle");

    if (isDarkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("bgLayer").style.background = "linear-gradient(135deg,#0a0a14 0%,#12122a 100%)";
        document.querySelector(".blob1").style.background = "#1a1a3e";
        document.querySelector(".blob2").style.background = "#0f0f2a";
        document.querySelector(".blob3").style.background = "#2a1a3e";
        btn.textContent = "🌙";
        localStorage.setItem("theme","dark");
    } else {
        document.body.classList.remove("dark-mode");
        btn.textContent = "🌞";
        localStorage.setItem("theme","light");
        if (currentCondition) applyWeatherTheme(currentCondition);
        else document.getElementById("bgLayer").style.background = weatherThemes.default.bg;
    }
});

if (localStorage.getItem("theme") === "dark") {
    isDarkMode = true;
    document.body.classList.add("dark-mode");
    document.getElementById("bgLayer").style.background = "linear-gradient(135deg,#0a0a14 0%,#12122a 100%)";
    document.getElementById("themeToggle").textContent   = "🌙";
}

document.getElementById("cityInput").addEventListener("keyup", e => {
    if (e.key === "Enter") getWeather();
});

function formatTime(unix) {
    return new Date(unix * 1000).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showSpinner(on) {
    document.getElementById("loadingSpinner").style.display = on ? "flex" : "none";
}

function showError(msg) {
    const el = document.getElementById("errorName");
    el.textContent   = msg;
    el.style.display = "block";
}

function hideError() {
    document.getElementById("errorName").style.display = "none";
}
