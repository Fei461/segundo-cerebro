export function featureHeader(eyebrow, title, subtitle = "", options = {}) {
  const emblem = options.emblem
    ? `
      <div class="feature-emblem-wrap">
        <span class="feature-emblem feature-emblem--${options.emblemTone || "default"}" aria-hidden="true">${options.emblem}</span>
      </div>
    `
    : "";
  const art = options.artSrc
    ? `<div class="feature-hero-art-wrap" aria-hidden="true"><img class="feature-hero-art" src="${options.artSrc}" alt=""></div>`
    : "";

  return `
    <header class="feature-header feature-header-shell${emblem ? " feature-header-with-emblem" : ""}">
      <div class="feature-header-copy">
        <p class="eyebrow">${eyebrow}</p>
        <h2>${title}</h2>
        ${subtitle ? `<p class="muted">${subtitle}</p>` : ""}
      </div>
      ${art || emblem}
    </header>
  `;
}

export function viewSwitcher(tab, currentView, items) {
  return `
    <nav class="view-switcher" aria-label="Vistas de sección">
      ${items
        .map(
          item => `
            <button
              class="view-switcher-chip${item.id === currentView ? " is-active" : ""}"
              type="button"
              data-action="open-module-view"
              data-tab="${tab}"
              data-view="${item.id}"
              aria-pressed="${item.id === currentView ? "true" : "false"}"
            >
              ${item.label}
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

export function sectionCard(eyebrow, title, body, actions = "", className = "") {
  if (!className && typeof actions === "string" && actions.includes("section-card")) {
    className = actions;
    actions = "";
  }

  const classes = ["subpanel", "stack", "minimalist-card", "section-card", className].filter(Boolean).join(" ");
  return `
    <section class="${classes}">
      <div class="section-head">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h4>${title}</h4>
        </div>
        ${actions}
      </div>
      ${body}
    </section>
  `;
}

export function emptyState(text) {
  return `<p class="muted empty-state">${text}</p>`;
}
