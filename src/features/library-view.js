import { featureHeader, sectionCard, viewSwitcher, emptyState } from "../ui/feature-layout.js";

function statCard(label, value, detail) {
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function normalizeBooks(state) {
  return Array.isArray(state.library?.books) ? state.library.books.slice() : [];
}

function sortedBooks(state) {
  return normalizeBooks(state).sort((left, right) => {
    const leftDate = String(left.finishedAt || left.startedAt || left.createdAt || "");
    const rightDate = String(right.finishedAt || right.startedAt || right.createdAt || "");
    return rightDate.localeCompare(leftDate);
  });
}

function avgRating(books) {
  const ratings = books.map(book => Number(book.rating || 0)).filter(value => value > 0);
  if (!ratings.length) return "—";
  return (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1);
}

function currentYear() {
  return new Date().getFullYear();
}

function booksThisYear(books) {
  const year = String(currentYear());
  return books.filter(book => String(book.finishedAt || book.startedAt || "").startsWith(year)).length;
}

function challengeProgress(challenge, books) {
  const year = Number(challenge?.year || currentYear());
  const target = Math.max(1, Number(challenge?.target || 12));
  const done = books.filter(book => String(book.finishedAt || "").startsWith(String(year))).length;
  return { year, target, done, percent: Math.min(100, Math.round((done / target) * 100)) };
}

function recentBooksList(books, limit = 4) {
  if (!books.length) return emptyState("Todavía no has guardado lecturas.");
  return books.slice(0, limit).map(book => {
    const meta = [book.author, book.finishedAt || book.startedAt, book.rating ? `${book.rating}/5` : "", book.status || ""]
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="entry">
        <div>
          <p class="entry-title">${book.title}</p>
          <p class="entry-meta">${meta || "Sin detalles extra"}</p>
          ${book.isbn ? `<p class="entry-note">ISBN: ${book.isbn}</p>` : ""}
          ${book.note ? `<p class="entry-note">${book.note}</p>` : ""}
        </div>
        <button class="ghost compact" type="button" data-action="delete-book" data-id="${book.id}">Eliminar</button>
      </article>
    `;
  }).join("");
}

function statusShelf(books) {
  if (!books.length) return emptyState("Cuando empieces a registrar libros, aquí verás el reparto por estado.");
  const grouped = books.reduce((map, book) => {
    const key = String(book.status || "sin estado");
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  return Array.from(grouped.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([status, count]) => `<article class="entry"><div><p class="entry-title">${status}</p><p class="entry-meta">${count} libro(s)</p></div></article>`)
    .join("");
}

export function renderLibraryFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const books = sortedBooks(state);
  const challenge = challengeProgress(state.library?.challenge, books);

  let body = "";

  if (currentView === "add") {
    body = `
      <div class="reading-grid">
        ${sectionCard(
          "Registrar",
          "Añadir libro",
          `
            <form id="book-form" class="stack">
              <div class="field-grid">
                <label><span>Título</span><input name="title" placeholder="Ej. El infinito en un junco" required></label>
                <label><span>Estado</span><select name="status"><option value="finished">Terminado</option><option value="reading">En lectura</option><option value="paused">En pausa</option><option value="wishlist">Pendiente</option><option value="dnf">Abandonado</option></select></label>
              </div>
              <div class="field-grid">
                <label><span>Terminé</span><input name="finishedAt" type="date"></label>
                <label><span>Valoración</span><input name="rating" type="number" min="1" max="5" placeholder="1-5"></label>
              </div>
              <details class="panel panel-toned disclosure-panel compact-disclosure">
                <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Más detalle</h4></div></summary>
                <div class="stack disclosure-body">
                  <div class="field-grid">
                    <label><span>Autora o autor</span><input name="author" placeholder="Opcional"></label>
                    <label><span>Formato</span><select name="format"><option value="">Sin definir</option><option>Papel</option><option>Ebook</option><option>Audiolibro</option></select></label>
                  </div>
                  <div class="field-grid">
                    <label><span>ISBN</span><input name="isbn" placeholder="Manual por ahora"></label>
                    <label><span>Empecé</span><input name="startedAt" type="date"></label>
                  </div>
                  <label><span>Nota</span><textarea name="note" rows="4" placeholder="Idea clave, cita, sensación o por qué te gustó."></textarea></label>
                </div>
              </details>
              <button class="primary" type="submit">Guardar libro</button>
            </form>
          `,
          "section-card-tinted section-card-recovery"
        )}
        ${sectionCard(
          "Reto",
          "Objetivo anual",
          `
            <form id="reading-challenge-form" class="stack">
              <div class="field-grid">
                <label><span>Año</span><input name="year" type="number" min="2000" max="2100" value="${challenge.year}" required></label>
                <label><span>Objetivo</span><input name="target" type="number" min="1" max="365" value="${challenge.target}" required></label>
              </div>
              <button class="primary" type="submit">Guardar reto</button>
            </form>
            <article class="summary-card summary-card-soft">
              <p class="entry-title">${challenge.done}/${challenge.target}</p>
              <p class="entry-meta">${challenge.percent}% del reto ${challenge.year}</p>
            </article>
          `,
          "section-card-glass section-card-recovery-light"
        )}
      </div>
    `;
  } else if (currentView === "history") {
    body = `
      <div class="reading-grid">
        ${sectionCard("Historial", "Libros guardados", `<div class="stack stack-tight">${recentBooksList(books, 16)}</div>`, "section-card-glass section-card-recovery-light")}
        ${sectionCard("Estados", "Cómo se reparte tu lectura", `<div class="stack stack-tight">${statusShelf(books)}</div>`, "section-card-glass section-card-recovery-light")}
      </div>
    `;
  } else {
    body = `
      <div class="reading-grid">
        ${sectionCard(
          "Resumen",
          "Biblioteca personal",
          `
            <section class="dashboard-summary compact-metrics feature-metrics-soft">
              ${statCard("Libros", books.length, "guardados")}
              ${statCard("Este año", booksThisYear(books), "terminados")}
              ${statCard("Media", avgRating(books), "valoración")}
              ${statCard("Activos", books.filter(book => book.status === "reading").length, "en lectura")}
            </section>
            <article class="summary-card summary-card-soft">
              <p class="eyebrow">Reto ${challenge.year}</p>
              <p class="metric">${challenge.done}/${challenge.target}</p>
              <p class="entry-meta">${challenge.percent}% completado</p>
            </article>
            <article class="summary-card summary-card-soft">
              <p class="eyebrow">Ahora</p>
              <p class="entry-title">${books.find(book => book.status === "reading")?.title || "Sin lectura activa"}</p>
              <p class="entry-meta">${books.find(book => book.status === "wishlist")?.title || "Sin siguiente libro claro"}</p>
            </article>
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="library" data-view="add">Añadir libro</button>
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="library" data-view="history">Ver historial</button>
            </div>
          `,
          "section-card-hero section-card-recovery"
        )}
        ${sectionCard("Recientes", "Lo último que has guardado", `<div class="stack stack-tight">${recentBooksList(books, 6)}</div>`, "section-card-glass section-card-recovery-light")}
      </div>
    `;
  }

  return `
    <section id="library-panel" class="panel stack app-feature-shell">
      ${featureHeader("Biblioteca", "Leer y recordar", "", { emblem: "✦", emblemTone: "library", artSrc: "./icons/scene-library.svg" })}
      ${viewSwitcher("library", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "add", label: "Añadir" },
        { id: "history", label: "Historial" }
      ])}
      ${body}
    </section>
  `;
}
