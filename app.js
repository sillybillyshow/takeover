// app.js

const workerURL = "https://tiktok-follower-api.sillybillyshowemail.workers.dev";

let populationData = [];
let mapData = [];
let followers = 0;
let previousFollowers = 0;
let map = null;

// DOM elements
const aboveBox = document.getElementById("above");
const belowBox = document.getElementById("below");
const followerEl = document.getElementById("followers");

async function loadData() {
  // Load full population dataset
  const popRes = await fetch("populationdata.json");
  populationData = await popRes.json();
  populationData.sort((a, b) => a.population - b.population);

  // Load reduced dataset for map
  const mapRes = await fetch("mapdata.json");
  mapData = await mapRes.json();

  initMap();
  await getFollowers(); // Fetch follower count on initial load
  updateRank(true);      // Render initial snapshot
  startClock();
}

// Fetch followers from worker
async function getFollowers() {
  const res = await fetch(workerURL);
  const data = await res.json();

  previousFollowers = followers;
  followers = data.followers;

  animateFollowerCount();
  updateRank();
  updateMap();
}

// Animate follower count smoothly
function animateFollowerCount() {
  const start = previousFollowers;
  const end = followers;
  const duration = 800;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const val = Math.floor(start + (end - start) * progress);
    followerEl.textContent = val.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Binary search to find current rank index
function findRank(value) {
  let low = 0;
  let high = populationData.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (populationData[mid].population < value) low = mid + 1;
    else high = mid - 1;
  }
  return low;
}

// Update leaderboard snapshot and animate overtaking
function updateRank(initial = false) {
  const index = findRank(followers);
  const oldIndex = findRank(previousFollowers);

  const above = populationData.slice(index, index + 4).reverse(); // Next to Beat above
  const below = populationData.slice(Math.max(0, index - 4), index); // Bigger Than below

  // Clear containers on initial render
  if (initial) {
    aboveBox.innerHTML = "";
    belowBox.innerHTML = "";

    above.forEach(c => {
      const el = document.createElement("div");
      el.className = "city";
      el.textContent = `${c.city}, ${c.country} — ${c.population.toLocaleString()}`;
      aboveBox.appendChild(el);
    });

    below.forEach(c => {
      const el = document.createElement("div");
      el.className = "city";
      el.textContent = `${c.city}, ${c.country} — ${c.population.toLocaleString()}`;
      belowBox.appendChild(el);
    });
    return;
  }

  // Animate overtaking if followers increased past cities
  if (index > oldIndex) {
    const passed = populationData.slice(oldIndex, index);
    passed.forEach(city => showOvertake(city));
  }

  // Update DOM elements for snapshot
  aboveBox.innerHTML = "";
  belowBox.innerHTML = "";

  above.forEach(c => {
    const el = document.createElement("div");
    el.className = "city";
    el.textContent = `${c.city}, ${c.country} — ${c.population.toLocaleString()}`;
    aboveBox.appendChild(el);
  });

  below.reverse().forEach(c => {
    const el = document.createElement("div");
    el.className = "city";
    el.textContent = `${c.city}, ${c.country} — ${c.population.toLocaleString()}`;
    belowBox.appendChild(el);
  });
}

// Show a pop-up when a city is overtaken
function showOvertake(city) {
  const el = document.createElement("div");
  el.textContent = `Overtook ${city.city} (${city.population.toLocaleString()})`;

  Object.assign(el.style, {
    position: "fixed",
    left: "50%",
    top: "80px",
    transform: "translateX(-50%)",
    background: "#00ff88",
    color: "#000",
    padding: "10px 18px",
    borderRadius: "20px",
    fontWeight: "bold",
    zIndex: 9999
  });

  document.body.appendChild(el);

  setTimeout(() => {
    el.style.transition = "all 0.8s";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -40px)";
  }, 200);

  setTimeout(() => el.remove(), 1000);
}

// Initialize MapLibre map
function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style: "https://demotiles.maplibre.org/style.json",
    center: [10, 20],
    zoom: 1.4
  });

  map.on("load", () => updateMap());
}

// Fixed updateMap() function
function updateMap() {
  if (!map) return;

  const features = mapData.map(c => ({
    type: "Feature",
    properties: { smaller: c.population < followers },
    geometry: { type: "Point", coordinates: [c.lng, c.lat] }
  }));

  const geo = { type: "FeatureCollection", features };

  if (map.getSource("cities")) {
    map.getSource("cities").setData(geo);
  } else {
    map.addSource("cities", {
      type: "geojson",
      data: geo,
      cluster: true,
      clusterRadius: 40
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "cities",
      filter: ["has", "point_count"],
      paint: { "circle-radius": 18, "circle-color": "#666" }
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "cities",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count"], "text-size": 12 }
    });

    map.addLayer({
      id: "points",
      type: "circle",
      source: "cities",
      filter: ["!has", "point_count"],
      paint: {
        "circle-radius": 5,
        "circle-color": ["case", ["get", "smaller"], "#00ff88", "#888"]
      }
    });
  }
}

// Calculate milliseconds until next GMT minute
function msToNextMinute() {
  const now = new Date();
  return (60 - now.getUTCSeconds()) * 1000 - now.getUTCMilliseconds();
}

// Countdown timer + GMT-minute scheduling
function startClock() {
  function updateTimer() {
    const now = new Date();
    const seconds = now.getUTCSeconds();
    const remain = 60 - seconds;
    document.getElementById("countdown").textContent = `Next update in ${remain}s`;
    document.getElementById("bar").style.width = (seconds / 60) * 100 + "%";
  }

  setInterval(updateTimer, 1000);

  function schedule() {
    setTimeout(async () => {
      await getFollowers();
      schedule();
    }, msToNextMinute());
  }

  schedule();
}

// Load everything
loadData();
