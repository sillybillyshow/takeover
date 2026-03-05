// app.js
const workerURL = "https://tiktok-follower-api.sillybillyshowemail.workers.dev";

let populationData = [];
let followers = 0;
let previousFollowers = 0;

const CARD_COUNT = 5; // Number of top/bottom cards
const cardsContainer = document.getElementById("cards-container");
const countdownEl = document.getElementById("countdown");
const barEl = document.getElementById("bar");

// Load population data and initial follower count
async function loadData() {
  const popRes = await fetch("populationdata.json");
  populationData = await popRes.json();
  populationData.sort((a,b) => a.population - b.population);

  await getFollowers();          // Initial follower fetch
  renderCards(true);             // Initial render
  startClock();                  // Start countdown
}

// Fetch follower count from worker (replace with mock for testing if needed)
async function getFollowers() {
  // Uncomment below for actual fetch
  /*
  const res = await fetch(workerURL);
  const data = await res.json();
  previousFollowers = followers;
  followers = data.followers;
  */

  // Mock for testing
  previousFollowers = followers;
  followers = previousFollowers === 0 ? 4258 : 4280;
}

// Binary search to find rank index in populationData
function findRank(value) {
  let low = 0, high = populationData.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high)/2);
    if (populationData[mid].population < value) low = mid + 1;
    else high = mid -1;
  }
  return low;
}

// Render leaderboard snapshot
function renderCards(initial=false) {
  const index = findRank(followers);
  const oldIndex = findRank(previousFollowers);
  const deltaIndex = index - oldIndex;

  const above = populationData.slice(index, index + CARD_COUNT).reverse(); // Next to beat
  const below = populationData.slice(Math.max(0, index - CARD_COUNT), index).reverse(); // Bigger than

  // Clear container
  cardsContainer.innerHTML = "";

  // Top cards
  above.forEach(city => {
    const card = document.createElement("div");
    card.className = "card top-card";
    card.textContent = `${city.city}, ${city.country} — ${city.population.toLocaleString()}`;
    cardsContainer.appendChild(card);
  });

  // Follower card
  const followerCard = document.createElement("div");
  followerCard.className = "card follower";
  followerCard.textContent = `Silly Billy Show Followers — ${followers.toLocaleString()}`;
  cardsContainer.appendChild(followerCard);

  // Bottom cards
  below.forEach(city => {
    const card = document.createElement("div");
    card.className = "card bottom-card";
    card.textContent = `${city.city}, ${city.country} — ${city.population.toLocaleString()}`;
    cardsContainer.appendChild(card);
  });

  if (!initial && deltaIndex !== 0) {
    animateCards(deltaIndex);
    animateFollowerCard(deltaIndex);
  }
}

// Animate surrounding cards sliding past follower card
function animateCards(deltaIndex) {
  const topCards = document.querySelectorAll(".top-card");
  const bottomCards = document.querySelectorAll(".bottom-card");
  const moveDistance = 60; // px per card for visual spacing

  const direction = deltaIndex > 0 ? 1 : -1; // 1 = follower increased (cards move down), -1 = follower decreased

  topCards.forEach((card, i) => {
    card.style.transition = "transform 0.8s ease, filter 0.8s ease";
    card.style.transform = `translateY(${moveDistance * direction}px)`;
    card.style.filter = "blur(2px)";
    setTimeout(() => {
      card.style.transform = `translateY(0px)`;
      card.style.filter = "blur(0px)";
    }, 50);
  });

  bottomCards.forEach((card, i) => {
    card.style.transition = "transform 0.8s ease, filter 0.8s ease";
    card.style.transform = `translateY(${moveDistance * direction}px)`;
    card.style.filter = "blur(2px)";
    setTimeout(() => {
      card.style.transform = `translateY(0px)`;
      card.style.filter = "blur(0px)";
    }, 50);
  });
}

// Animate follower card “lift” motion
function animateFollowerCard(deltaIndex) {
  const followerCard = document.querySelector(".card.follower");
  if (!followerCard) return;

  const moveDistance = 20; // px vertical lift
  const direction = deltaIndex > 0 ? -1 : 1; // move up if delta > 0, down if delta < 0

  followerCard.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
  followerCard.style.transform = `translateY(${moveDistance * direction}px)`;
  followerCard.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";

  setTimeout(() => {
    followerCard.style.transition = "transform 0.5s ease, box-shadow 0.5s ease";
    followerCard.style.transform = "translateY(0px)";
    followerCard.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
  }, 300);
}

// Milliseconds until next GMT minute
function msToNextMinute() {
  const now = new Date();
  return (60 - now.getUTCSeconds())*1000 - now.getUTCMilliseconds();
}

// Countdown timer + update scheduler
function startClock() {
  function updateTimer() {
    const now = new Date();
    const seconds = now.getUTCSeconds();
    const remain = 60 - seconds;
    countdownEl.textContent = `Next update in ${remain}s`;
    barEl.style.width = ((seconds/60)*100) + "%";
  }
  setInterval(updateTimer, 1000);

  function schedule() {
    setTimeout(async () => {
      await getFollowers();
      renderCards();
      schedule();
    }, msToNextMinute());
  }
  schedule();
}

// Start
loadData();
