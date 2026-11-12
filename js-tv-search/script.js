/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");
const favoritesList = document.getElementById("favorites");
const clearFavoritesBtn = document.getElementById("clearFavorites");
const FAVORITES_KEY = "palabas-favorites";
let currentResults = [];
let favorites = [];

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

favorites = getFavorites();
renderFavorites();

if (clearFavoritesBtn) {
  clearFavoritesBtn.addEventListener("click", () => {
    favorites = [];
    saveFavorites();
    renderFavorites();
    updateFavoriteButtons();
  });
}

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array
async function testRequest() {
  const url = searchURL("friends");
  console.log("Request:", url); // live mode: open this URL in a new tab to see the raw JSON

  const response = await fetch(url); // 1st await: the response arrives
  console.log("Status:", response.status, "ok?", response.ok);

  const data = await response.json(); // 2nd await: the body is read as JSON
  console.log(data); // an ARRAY of { score, show }
  console.log("How many:", data.length);
  console.log("First show:", data[0].show.name, data[0].show.premiered);
}

testRequest();
// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form
function getFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item) => item && item.id !== undefined && item.name)
      .map((item) => ({ id: Number(item.id), name: String(item.name) }));
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function isFavorite(show) {
  const targetId = Number(show.id);
  return favorites.some((item) => Number(item.id) === targetId);
}

function toggleFavorite(show) {
  const showId = Number(show.id);
  const showName = show.name;
  const index = favorites.findIndex((item) => Number(item.id) === showId);

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push({ id: showId, name: showName });
  }

  saveFavorites();
  renderFavorites();
  updateFavoriteButtons();
}

function createFavoriteButton(show) {
  const button = el("button", "favorite-button", isFavorite(show) ? "🌟" : "⭐");
  button.type = "button";
  button.dataset.id = show.id;
  button.classList.toggle("active", isFavorite(show));
  button.setAttribute("aria-label", isFavorite(show) ? "Remove from favorites" : "Add to favorites");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(show);
  });
  return button;
}

function updateFavoriteButtons() {
  document.querySelectorAll(".favorite-button").forEach((button) => {
    const isSaved = favorites.some((item) => Number(item.id) === Number(button.dataset.id));
    button.textContent = isSaved ? "🌟" : "⭐";
    button.classList.toggle("active", isSaved);
    button.setAttribute("aria-label", isSaved ? "Remove from favorites" : "Add to favorites");
  });
}

function renderFavorites() {
  if (!favoritesList) return;
  favoritesList.innerHTML = "";

  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="empty-favorites">No favorite shows yet.</p>';
    return;
  }

  favorites.forEach((show) => {
    const item = el("article", "favorite-item");
    item.dataset.id = show.id;

    const poster = show.image
      ? (() => {
          const img = el("img", "favorite-poster");
          img.src = show.image.medium || show.image.original;
          img.alt = `Poster: ${show.name}`;
          return img;
        })()
      : el("span", "favorite-poster none", "No poster");

    const info = el("div", "favorite-info");
    info.append(el("strong", "", show.name), el("span", "", show.premiered ? show.premiered.slice(0, 4) : "No year"));

    const removeButton = el("button", "favorite-remove", "×");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${show.name} from favorites`);
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(show);
    });

    item.addEventListener("click", () => showDetails(show.id));
    item.append(poster, info, removeButton);
    favoritesList.appendChild(item);
  });
}

function renderResults(items) {
  currentResults = items;
  results.innerHTML = ""; // clear the last search

  items.forEach((item) => {
    const show = item.show; // each item is { score, show }

    const card = el("article", "card");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.dataset.id = show.id; // remember which show this card is

    const rating = show.rating.average; // a number, or null if nobody rated it yet
    const favoriteButton = createFavoriteButton(show);
    card.append(
      favoriteButton,
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );

    card.addEventListener("click", (event) => {
      if (event.target.closest(".favorite-button")) return;
      showDetails(show.id);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetails(show.id);
      }
    });

    results.appendChild(card);
  });

  updateFavoriteButtons();
}

async function searchShows(query) {
  const response = await fetch(searchURL(query));
  const data = await response.json();
  renderResults(data);
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the form from reloading the page
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check
async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error("Can't reach TVmaze. Check your internet, or use sample mode.");
  }
  if (response.status === 429) {
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }
  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";
  try {
    const data = await getJSON(searchURL(query));
    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }
    renderResults(data);
    setStatus(/* "6 shows found…" or "1 show found…" */);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)
results.addEventListener("click", (event) => {
  if (event.target.closest(".favorite-button")) return;
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const show = await getJSON(showURL(id));
    renderDetails(show);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

function renderDetails(show) {
  const where = show.network ? show.network.name : show.webChannel ? show.webChannel.name : "";
  const minutes = show.runtime || show.averageRuntime; // runtime is null when episodes vary

  const info = el("div", "info");
  info.append(
    el("h2", "", show.name),
    el("p", "meta", [yearRange(show), where, show.genres.join(", "), minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ")),
    el("p", "score", show.rating.average ? `★ ${show.rating.average} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary)) // text only, never innerHTML
  );

  const links = el("p", "links");
  const tvmaze = el("a", "", "View on TVmaze ↗");
  tvmaze.href = show.url;
  tvmaze.target = "_blank";
  links.append(tvmaze);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}
// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)
async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const start = performance.now();
    // Start all three requests now, then wait for ALL of them
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);
    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);
    renderDetails(show, cast, seasons);
  } catch (error) {
    // If ANY of the three fails, Promise.all rejects and we land here
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

function renderDetails(show, cast, seasons) {
  const where = show.network ? show.network.name : show.webChannel ? show.webChannel.name : "";
  const minutes = show.runtime || show.averageRuntime; // runtime is null when episodes vary
  const seasonText = seasons.length === 1 ? "1 season" : `${seasons.length} seasons`;

  const info = el("div", "info");
  const titleRow = el("div", "detail-header");
  titleRow.append(createFavoriteButton(show), el("h2", "", show.name));

  info.append(
    titleRow,
    el("p", "meta", [yearRange(show), where, seasonText, minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ")),
    el("p", "meta", show.genres.join(", ")),
    el("p", "score", show.rating.average ? `★ ${show.rating.average} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary)) // text only, never innerHTML
  );

  // The first 6 cast members: "Bryan Cranston as Walter White"
  if (cast.length > 0) {
    const list = el("ul", "cast");
    cast.slice(0, 6).forEach((member) => {
      const li = el("li", "", member.person.name + " ");
      li.append(el("span", "", "as " + member.character.name));
      list.append(li);
    });
    info.append(el("h3", "", "Cast"), list);
  }

  const links = el("p", "links");
  const tvmaze = el("a", "", "View on TVmaze ↗");
  tvmaze.href = show.url;
  tvmaze.target = "_blank";
  links.append(tvmaze);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}
