(() => {
  "use strict";

  const app = document.getElementById("app");

  const CATEGORY_LABELS = {
    fruehstueck: "Frühstück",
    mittag: "Mittag",
    backen: "Backen",
    getraenke: "Getränke",
    sonstiges: "Sonstiges",
  };

  let recipeIndex = null; // cached list from recipes/index.json
  let state = {
    search: "",
    category: "",
    cuisine: "",
  };

  function categoryLabel(key) {
    return CATEGORY_LABELS[key] || key;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function loadIndex() {
    if (recipeIndex) return recipeIndex;
    const res = await fetch("recipes/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Konnte recipes/index.json nicht laden");
    recipeIndex = await res.json();
    return recipeIndex;
  }

  async function loadRecipe(id) {
    const res = await fetch(`recipes/${id}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Konnte Rezept "${id}" nicht laden`);
    return res.json();
  }

  function renderLoading() {
    app.innerHTML = `<p class="empty-state">Lädt…</p>`;
  }

  function renderError(message) {
    app.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
  }

  function matchesFilters(entry) {
    const search = state.search.trim().toLowerCase();
    if (search && !entry.title.toLowerCase().includes(search)) return false;
    if (state.category && entry.category !== state.category) return false;
    if (state.cuisine && entry.cuisine !== state.cuisine) return false;
    return true;
  }

  function renderOverview() {
    const categories = Array.from(new Set(recipeIndex.map((r) => r.category))).sort();
    const cuisines = Array.from(new Set(recipeIndex.map((r) => r.cuisine).filter(Boolean))).sort();

    const filtered = recipeIndex.filter(matchesFilters);

    const cards = filtered
      .map(
        (r) => `
      <a class="recipe-card" href="#/rezept/${encodeURIComponent(r.id)}">
        <h3>${escapeHtml(r.title)}</h3>
        <div class="meta">
          <span class="tag">${escapeHtml(categoryLabel(r.category))}</span>
          ${r.cuisine ? `<span class="tag">${escapeHtml(r.cuisine)}</span>` : ""}
          ${r.time ? `<span class="tag">${escapeHtml(r.time)} Min.</span>` : ""}
        </div>
      </a>`
      )
      .join("");

    app.innerHTML = `
      <div class="filters">
        <input type="search" id="f-search" placeholder="Rezept suchen…" value="${escapeHtml(state.search)}" />
        <select id="f-category">
          <option value="">Alle Arten</option>
          ${categories
            .map(
              (c) =>
                `<option value="${escapeHtml(c)}" ${c === state.category ? "selected" : ""}>${escapeHtml(
                  categoryLabel(c)
                )}</option>`
            )
            .join("")}
        </select>
        <select id="f-cuisine">
          <option value="">Alle Küchen</option>
          ${cuisines
            .map(
              (c) =>
                `<option value="${escapeHtml(c)}" ${c === state.cuisine ? "selected" : ""}>${escapeHtml(c)}</option>`
            )
            .join("")}
        </select>
        <button type="button" class="reset-filters" id="f-reset">Filter zurücksetzen</button>
      </div>
      <p class="filter-summary">${filtered.length} von ${recipeIndex.length} Rezepten</p>
      ${
        filtered.length
          ? `<div class="recipe-grid">${cards}</div>`
          : `<p class="empty-state">Keine Rezepte gefunden.</p>`
      }
    `;

    document.getElementById("f-search").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderOverview();
    });
    document.getElementById("f-category").addEventListener("change", (e) => {
      state.category = e.target.value;
      renderOverview();
    });
    document.getElementById("f-cuisine").addEventListener("change", (e) => {
      state.cuisine = e.target.value;
      renderOverview();
    });
    document.getElementById("f-reset").addEventListener("click", () => {
      state = { search: "", category: "", cuisine: "" };
      renderOverview();
    });
  }

  function renderDetail(recipe) {
    const ingredients = (recipe.ingredients || [])
      .map(
        (ing) => `
      <li>
        <span class="name">${escapeHtml(ing.name)}</span>
        <span class="amount">${escapeHtml([ing.amount, ing.unit].filter(Boolean).join(" "))}</span>
      </li>`
      )
      .join("");

    const steps = (recipe.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("");

    app.innerHTML = `
      <a class="back-link" href="#/">&larr; Zur Übersicht</a>
      <article class="recipe-detail">
        <h1>${escapeHtml(recipe.title)}</h1>
        <div class="meta-row">
          <span class="tag">${escapeHtml(categoryLabel(recipe.category))}</span>
          ${recipe.cuisine ? `<span class="tag">${escapeHtml(recipe.cuisine)}</span>` : ""}
        </div>
        <div class="meta-row">
          ${recipe.time ? `<div class="stat"><strong>${escapeHtml(recipe.time)} Min.</strong>Zubereitungszeit</div>` : ""}
          ${recipe.servings ? `<div class="stat"><strong>${escapeHtml(recipe.servings)}</strong>Portionen</div>` : ""}
        </div>
        <div class="recipe-sections">
          <section>
            <h2>Zutaten</h2>
            <ul class="ingredients-list">${ingredients}</ul>
          </section>
          <section>
            <h2>Zubereitung</h2>
            <ol class="steps-list">${steps}</ol>
          </section>
        </div>
        ${recipe.notes ? `<p class="notes">${escapeHtml(recipe.notes)}</p>` : ""}
      </article>
    `;
  }

  async function router() {
    const hash = window.location.hash || "#/";
    const detailMatch = hash.match(/^#\/rezept\/(.+)$/);

    try {
      if (detailMatch) {
        renderLoading();
        const id = decodeURIComponent(detailMatch[1]);
        const recipe = await loadRecipe(id);
        renderDetail(recipe);
      } else {
        renderLoading();
        await loadIndex();
        renderOverview();
      }
    } catch (err) {
      renderError(err.message);
    }
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
})();
