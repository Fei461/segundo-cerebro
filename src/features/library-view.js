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

function booksThisYear(books) {
  const year = String(new Date().getFullYear());
  return books.filter(book => String(book.finishedAt || book.startedAt || "").startsWith(year)).length;
}

function recentBooksList(books, limit = 5) {
  if (!books.length) return emptyState("Todavía no has guardado lecturas.");
  return books.slice(0, limit).map(book => {
    const meta = [
      book.author,
      book.finishedAt || book.startedAt,
      book.rating ? `${book.rating}/5` : ""
    ].filter(Boolean).join(" · ");

    return `
      <article class="entry">
        <div>
          <p class="entry-title">${book.title}</p>
          <p class="entry-meta">${meta || "Sin detalles extra"}</p>
          ${book.note ? `<p class="entry-note">${book.note}</p>` : ""}
        </div>
        <button class="ghost compact" type="button" data-action="delete-book" data-id="${book.id}">Eliminar</button>
      </article>
    `;
  }).join("");
}

function yearShelf(books) {
  if (!books.length) return emptyState("Cuando empieces a registrar libros, aquí verás el ritmo de lectura.");
  const grouped = books.reduce((map, book) => {
    const key = String(book.finishedAt || book.startedAt || "Sin fecha").slice(0, 4) || "Sin fecha";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([year, count]) => `<article class="entry"><div><p class="entry-title">${year}</p><p class="entry-meta">${count} libro(s)</p></div></article>`)
    .join("");
}

export function renderLibraryFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const books = sortedBooks(state);

  let body = "";

  if (currentView === "add") {
    body = sectionCard(
      "Registrar",
      "Añadir libro",
      `
        <form id="book-form" class="stack">
          <div class="field-grid">
            <label><span>Título</span><input name="title" placeholder="Ej. El infinito en un junco" required></label>
            <label><span>Autora o autor</span><input name="author" placeholder="Opcional"></label>
          </div>
          <div class="field-grid">
            <label><span>Empecé</span><input name="startedAt" type="date"></label>
            <label><span>Terminé</span><input name="finishedAt" type="date"></label>
          </div>
          <div class="field-grid">
            <label><span>Valoración</span><input name="rating" type="number" min="1" max="5" placeholder="1-5"></label>
            <label><span>Estado</span><select name="status"><option value="finished">Terminado</option><option value="reading">En lectura</option><option value="paused">En pausa</option><option value="wishlist">Pendiente</option></select></label>
          </div>
          <label><span>Nota</span><textarea name="note" rows="4" placeholder="Idea clave, cita, sensación o por qué te gustó."></textarea></label>
          <button class="primary" type="submit">Guardar libro</button>
        </form>
      `,
      "section-card-tinted section-card-recovery"
    );
  } else if (currentView === "history") {
    body = `
      <div class="reading-grid">
        ${sectionCard("Historial", "Libros guardados", `<div class="stack stack-tight">${recentBooksList(books, 24)}</div>`, "section-card-glass section-card-recovery-light")}
        ${sectionCard("Ritmo", "Lectura por año", `<div class="stack stack-tight">${yearShelf(books)}</div>`, "section-card-glass section-card-recovery-light")}
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
      ${featureHeader("Biblioteca", "Leer y recordar", "", { emblem: "✦", emblemTone: "recovery" })}
      ${viewSwitcher("library", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "add", label: "Añadir" },
        { id: "history", label: "Historial" }
      ])}
      ${body}
    </section>
  `;
}
