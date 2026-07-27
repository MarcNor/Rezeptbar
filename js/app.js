(() => {
  "use strict";

  const app = document.getElementById("app");
  const sectionNav = document.getElementById("section-nav");
  const themeToggle = document.getElementById("theme-toggle");
  const imageToggle = document.getElementById("image-toggle");

  function currentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function updateThemeToggle(theme) {
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"
    );
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateThemeToggle(theme);
  }

  themeToggle.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  updateThemeToggle(currentTheme());

  let showImages = localStorage.getItem("showImages") !== "false";

  function updateImageToggle() {
    imageToggle.textContent = showImages ? "🖼️" : "🚫";
    imageToggle.setAttribute(
      "aria-label",
      showImages ? "Bilder in Übersicht ausblenden" : "Bilder in Übersicht anzeigen"
    );
  }

  imageToggle.addEventListener("click", () => {
    showImages = !showImages;
    localStorage.setItem("showImages", String(showImages));
    updateImageToggle();
    router();
  });

  updateImageToggle();

  const CATEGORY_LABELS = {
    fruehstueck: "Frühstück",
    mittag: "Mittag",
    backen: "Backen",
    getraenke: "Getränke",
    sonstiges: "Sonstiges",
  };

  const SECTIONS = {
    kochen: { label: "Kochen", categories: ["fruehstueck", "mittag", "sonstiges"] },
    backen: { label: "Backen", categories: ["backen"] },
    getraenke: { label: "Getränke", categories: ["getraenke"] },
  };
  const DEFAULT_SECTION = "kochen";

  const CATEGORY_TO_SECTION = {};
  for (const [section, def] of Object.entries(SECTIONS)) {
    for (const cat of def.categories) CATEGORY_TO_SECTION[cat] = section;
  }

  const TIME_FILTERS = [15, 30, 60, 90];

  let recipeIndex = null; // cached list from recipes/index.json
  const sectionState = {
    kochen: { search: "", category: "", cuisine: "", maxTime: "" },
    backen: { search: "", category: "", cuisine: "", maxTime: "" },
    getraenke: { search: "", category: "", cuisine: "", maxTime: "" },
  };
  function categoryLabel(key) {
    return CATEGORY_LABELS[key] || key;
  }

  function sectionForCategory(category) {
    return CATEGORY_TO_SECTION[category] || DEFAULT_SECTION;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setActiveSection(section) {
    sectionNav.querySelectorAll("a[data-section]").forEach((a) => {
      a.classList.toggle("active", a.dataset.section === section);
    });
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

  function matchesFilters(entry, st) {
    const search = st.search.trim().toLowerCase();
    if (search && !entry.title.toLowerCase().includes(search)) return false;
    if (st.category && entry.category !== st.category) return false;
    if (st.cuisine && entry.cuisine !== st.cuisine) return false;
    if (st.maxTime && (!entry.time || entry.time > Number(st.maxTime))) return false;
    return true;
  }

  function renderOverview(section) {
    const sectionDef = SECTIONS[section];
    const st = sectionState[section];
    const sectionRecipes = recipeIndex.filter((r) => sectionDef.categories.includes(r.category));

    const categories =
      sectionDef.categories.length > 1
        ? Array.from(new Set(sectionRecipes.map((r) => r.category))).sort()
        : [];
    const cuisines = Array.from(new Set(sectionRecipes.map((r) => r.cuisine).filter(Boolean))).sort();
    const hasTime = sectionRecipes.some((r) => r.time);

    const filtered = sectionRecipes.filter((r) => matchesFilters(r, st));

    const cards = filtered
      .map(
        (r) => `
      <a class="recipe-card" href="#/rezept/${encodeURIComponent(r.id)}">
        ${
          showImages && r.image
            ? `<img class="recipe-card-thumb" src="${escapeHtml(r.image)}" alt="" loading="lazy" />`
            : ""
        }
        <div class="recipe-card-body">
          <h3>${escapeHtml(r.title)}</h3>
          <div class="meta">
            <span class="tag">${escapeHtml(categoryLabel(r.category))}</span>
            ${r.cuisine ? `<span class="tag">${escapeHtml(r.cuisine)}</span>` : ""}
            ${r.time ? `<span class="tag">${escapeHtml(r.time)} Min.</span>` : ""}
          </div>
        </div>
      </a>`
      )
      .join("");

    app.innerHTML = `
      <h2 class="section-heading">${escapeHtml(sectionDef.label)}</h2>
      <div class="filters">
        <input type="search" id="f-search" placeholder="Rezept suchen…" value="${escapeHtml(st.search)}" />
        ${
          categories.length
            ? `<select id="f-category">
                <option value="">Alle Arten</option>
                ${categories
                  .map(
                    (c) =>
                      `<option value="${escapeHtml(c)}" ${c === st.category ? "selected" : ""}>${escapeHtml(
                        categoryLabel(c)
                      )}</option>`
                  )
                  .join("")}
              </select>`
            : ""
        }
        ${
          cuisines.length
            ? `<select id="f-cuisine">
                <option value="">Alle Küchen</option>
                ${cuisines
                  .map(
                    (c) =>
                      `<option value="${escapeHtml(c)}" ${c === st.cuisine ? "selected" : ""}>${escapeHtml(
                        c
                      )}</option>`
                  )
                  .join("")}
              </select>`
            : ""
        }
        ${
          hasTime
            ? `<select id="f-time">
                <option value="">Alle Zeiten</option>
                ${TIME_FILTERS.map(
                  (t) =>
                    `<option value="${t}" ${String(t) === st.maxTime ? "selected" : ""}>bis ${t} Min.</option>`
                ).join("")}
              </select>`
            : ""
        }
        <button type="button" class="reset-filters" id="f-reset">Filter zurücksetzen</button>
      </div>
      <p class="filter-summary">${filtered.length} von ${sectionRecipes.length} Rezepten</p>
      ${
        filtered.length
          ? `<div class="recipe-grid">${cards}</div>`
          : `<p class="empty-state">Keine Rezepte gefunden.</p>`
      }
    `;

    document.getElementById("f-search").addEventListener("input", (e) => {
      st.search = e.target.value;
      renderOverview(section);
    });
    const categorySelect = document.getElementById("f-category");
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        st.category = e.target.value;
        renderOverview(section);
      });
    }
    const cuisineSelect = document.getElementById("f-cuisine");
    if (cuisineSelect) {
      cuisineSelect.addEventListener("change", (e) => {
        st.cuisine = e.target.value;
        renderOverview(section);
      });
    }
    const timeSelect = document.getElementById("f-time");
    if (timeSelect) {
      timeSelect.addEventListener("change", (e) => {
        st.maxTime = e.target.value;
        renderOverview(section);
      });
    }
    document.getElementById("f-reset").addEventListener("click", () => {
      sectionState[section] = { search: "", category: "", cuisine: "", maxTime: "" };
      renderOverview(section);
    });
  }

  function scaleAmount(amount, factor) {
    if (amount === undefined || amount === null) return amount;
    const normalized = String(amount).trim().replace(",", ".");
    if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) return amount;
    const scaled = Math.round(parseFloat(normalized) * factor * 100) / 100;
    return String(scaled);
  }

  function groupIngredients(ingredients) {
    const groups = [];
    let current = null;
    for (const ing of ingredients) {
      const component = ing.component || null;
      if (!current || current.component !== component) {
        current = { component, items: [] };
        groups.push(current);
      }
      current.items.push(ing);
    }
    return groups;
  }

  function renderDetail(recipe, section) {
    const baseServings = recipe.servings || null;
    let servings = baseServings;

    function renderIngredients() {
      const factor = baseServings ? servings / baseServings : 1;
      const groups = groupIngredients(recipe.ingredients || []);
      return groups
        .map((group) => {
          const items = group.items
            .map(
              (ing) => `
          <li>
            <span class="name">${escapeHtml(ing.name)}</span>
            <span class="amount">${escapeHtml(
              [scaleAmount(ing.amount, factor), ing.unit].filter(Boolean).join(" ")
            )}</span>
          </li>`
            )
            .join("");
          return `
          ${
            group.component
              ? `<h3 class="ingredient-group-heading">${escapeHtml(group.component)}</h3>`
              : ""
          }
          <ul class="ingredients-list">${items}</ul>`;
        })
        .join("");
    }

    function renderServingsStat() {
      if (!baseServings) return "";
      return `
        <div class="stat servings-stat">
          <div class="servings-control">
            <button type="button" class="servings-btn" id="servings-dec" aria-label="Weniger Portionen">&minus;</button>
            <strong>${servings}</strong>
            <button type="button" class="servings-btn" id="servings-inc" aria-label="Mehr Portionen">+</button>
          </div>
          Portionen
        </div>`;
    }

    const steps = (recipe.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("");

    function render() {
      app.innerHTML = `
        <a class="back-link" href="#/${section}">&larr; Zur Übersicht</a>
        <article class="recipe-detail">
          ${
            recipe.image
              ? `<img class="recipe-hero" src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" />`
              : ""
          }
          <h1>${escapeHtml(recipe.title)}</h1>
          <div class="meta-row">
            <span class="tag">${escapeHtml(categoryLabel(recipe.category))}</span>
            ${recipe.cuisine ? `<span class="tag">${escapeHtml(recipe.cuisine)}</span>` : ""}
          </div>
          <div class="meta-row">
            ${recipe.time ? `<div class="stat"><strong>${escapeHtml(recipe.time)} Min.</strong>Zubereitungszeit</div>` : ""}
            ${renderServingsStat()}
          </div>
          ${
            recipe.utensils && recipe.utensils.length
              ? `<section class="utensils-section">
                  <h2>Utensilien</h2>
                  <ul class="utensils-list">${recipe.utensils
                    .map((u) => `<li class="tag">${escapeHtml(u)}</li>`)
                    .join("")}</ul>
                </section>`
              : ""
          }
          <div class="recipe-sections">
            <section>
              <h2>Zutaten</h2>
              ${renderIngredients()}
            </section>
            <section>
              <h2>Zubereitung</h2>
              <ol class="steps-list">${steps}</ol>
            </section>
          </div>
          ${recipe.notes ? `<p class="notes">${escapeHtml(recipe.notes)}</p>` : ""}
        </article>
      `;

      const dec = document.getElementById("servings-dec");
      const inc = document.getElementById("servings-inc");
      if (dec) {
        dec.addEventListener("click", () => {
          if (servings > 1) {
            servings -= 1;
            render();
          }
        });
      }
      if (inc) {
        inc.addEventListener("click", () => {
          servings += 1;
          render();
        });
      }
    }

    render();
  }

  async function router() {
    const hash = window.location.hash || "";
    const detailMatch = hash.match(/^#\/rezept\/(.+)$/);
    const sectionMatch = hash.match(/^#\/(kochen|backen|getraenke)$/);

    try {
      if (detailMatch) {
        renderLoading();
        const id = decodeURIComponent(detailMatch[1]);
        const recipe = await loadRecipe(id);
        const section = sectionForCategory(recipe.category);
        setActiveSection(section);
        renderDetail(recipe, section);
      } else if (sectionMatch) {
        const section = sectionMatch[1];
        setActiveSection(section);
        renderLoading();
        await loadIndex();
        renderOverview(section);
      } else {
        window.location.hash = `#/${DEFAULT_SECTION}`;
      }
    } catch (err) {
      renderError(err.message);
    }
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
})();
