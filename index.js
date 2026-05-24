const EVENTS = [
    { id: 1, title: "Jazz Night at The Rooftop", venue: "Sky Lounge", category: "🎷 Music", neighborhood: "Downtown", date_start: "2026-06-01", date_end: "2026-06-01", price: "$$", description: "Live jazz trio with a city view." },
    { id: 2, title: "Modern Sculpture Exhibition", venue: "City Arts Museum", category: "🖼️ Art", neighborhood: "Midtown", date_start: "2026-05-20", date_end: "2026-07-15", description: "A 2-month showcase of contemporary sculpture." },
    { id: 3, title: "Street Food Festival", venue: "Riverside Park", category: "🍜 Food", neighborhood: "East Side", date_start: "2026-06-07", date_end: "2026-06-09", price: "$", description: "30+ vendors, live cooking demos." },
    { id: 4, title: "Indie Film Screening", venue: "The Criterion", category: "🎬 Film", neighborhood: "West Village", date_start: "2026-06-03", date_end: "2026-06-03", price: "$$$", description: "Premiere of award-winning short films." },
    { id: 5, title: "Pop-Up Vintage Market", venue: "Union Square", category: "🛍️ Market", neighborhood: "Downtown", date_start: "2026-06-14", date_end: "2026-06-15", price: "Free", description: "Curated vintage clothing and records." },
    { id: 6, title: "Photography Walk", venue: "Waterfront District", category: "📸 Art", neighborhood: "Harbor", date_start: "2026-06-08", date_end: "2026-06-08", price: "Free", description: "Guided 2-hour street photography walk." },
    { id: 7, title: "Electronic Music Night", venue: "The Basement", category: "🎷 Music", neighborhood: "East Side", date_start: "2026-06-13", date_end: "2026-06-13", price: "$$", description: "Techno and house music until 4am." },
    { id: 8, title: "Watercolor Workshop", venue: "Studio Craft", category: "🖼️ Art", neighborhood: "Midtown", date_start: "2026-06-05", date_end: "2026-06-05", price: "$$", description: "Beginner-friendly 3-hour workshop." },
    { id: 9, title: "Taco Tuesday Pop-Up", venue: "El Mercado", category: "🍜 Food", neighborhood: "West Village", date_start: "2026-06-10", date_end: "2026-06-10", price: "$", description: "Special guest chefs, limited seats." },
    { id: 10, title: "Silent Disco", venue: "Rooftop Garden", category: "🎷 Music", neighborhood: "Harbor", date_start: "2026-06-21", date_end: "2026-06-21", price: "$$", description: "Three channels, one dance floor." }
  ];
  
  /* ---------- Category → color map (from CSS custom props) ---------- */
  const CATEGORY_COLORS = {
    "🎷 Music":  "var(--cat-music)",
    "🖼️ Art":    "var(--cat-art)",
    "📸 Art":    "var(--cat-art)",
    "🍜 Food":   "var(--cat-food)",
    "🎬 Film":   "var(--cat-film)",
    "🛍️ Market": "var(--cat-market)"
  };
  
  /* ---------- Mutable app state ---------- */
  const state = {
    view: 'list',          // 'list' | 'timeline'
    search: '',
    category: 'all',       // emoji string like "🎷" or "all"
    loading: true          // true while skeleton is visible
  };
  
  /* Pretend "today" is during June 2026 so the demo data has live events.
     Comment this out and uncomment the real Date() line to use the real clock. */
  const TODAY = new Date('2026-06-08T12:00:00');
  // const TODAY = new Date();
  
  /* ---------- Element refs ---------- */
  const els = {
    search: document.getElementById('search'),
    categories: document.getElementById('categories'),
    activePills: document.getElementById('active-pills'),
    listView: document.getElementById('list-view'),
    timelineView: document.getElementById('timeline-view'),
    toggleBtns: document.querySelectorAll('.toggle-btn'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    bottomSheet: document.getElementById('bottom-sheet'),
    sheetContent: document.getElementById('sheet-content'),
    sheetClose: document.getElementById('sheet-close')
  };
  
  /* =========================================================================
     Helpers
     ========================================================================= */
  
  /* Extract the emoji from a category like "🎷 Music" → "🎷"
     (everything before the first space). */
  function getEmoji(category) {
    return category.split(' ')[0];
  }
  
  /* Get color for an event based on its category. */
  function colorFor(category) {
    return CATEGORY_COLORS[category] || 'var(--color-accent)';
  }
  
  /* Parse YYYY-MM-DD as a local-noon date so timezone shifts don't push the
     day off by one. */
  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  
  /* Strip the time off a Date so two dates can be compared as days. */
  function dayOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  
  /* Difference in whole days (end - start). */
  function daysBetween(start, end) {
    return Math.round((dayOnly(end) - dayOnly(start)) / 86400000);
  }
  
  /* "Jun 7" or "Jun 7 – Jun 9" depending on whether start==end. */
  function formatDateRange(startStr, endStr) {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const opts = { month: 'short', day: 'numeric' };
    const s = start.toLocaleDateString('en-US', opts);
    if (startStr === endStr) return s;
    const e = end.toLocaleDateString('en-US', opts);
    return `${s} – ${e}`;
  }
  
  /* Compact date for the list column.
     Single day:     "Jun 1"
     Same month:     "Jun 7\n–9"   (two lines, monospace)
     Crosses month:  "Jun 28\n–Jul 2" */
  function formatDateCompact(startStr, endStr) {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const sMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const sDay = start.getDate();
    if (startStr === endStr) return `${sMonth} ${sDay}`;
    const eDay = end.getDate();
    if (start.getMonth() === end.getMonth()) {
      return `${sMonth} ${sDay}<br>–${eDay}`;
    }
    const eMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${sMonth} ${sDay}<br>–${eMonth} ${eDay}`;
  }
  
  /* Is TODAY within [start, end]? */
  function isHappeningNow(ev) {
    const today = dayOnly(TODAY);
    return today >= dayOnly(parseDate(ev.date_start)) &&
           today <= dayOnly(parseDate(ev.date_end));
  }
  
  /* Does the event start within the next 7 days (and not started yet)? */
  function isThisWeek(ev) {
    const today = dayOnly(TODAY);
    const start = dayOnly(parseDate(ev.date_start));
    const diff = daysBetween(today, start);
    return diff > 0 && diff <= 7;
  }
  
  /* =========================================================================
     Filtering
     ========================================================================= */
  
  /* Apply search + category filters to the EVENTS list. */
  function getFilteredEvents() {
    const q = state.search.trim().toLowerCase();
    return EVENTS.filter(ev => {
      // Category filter (compare on the emoji prefix only,
      // since "🖼️ Art" and "📸 Art" share label "Art" but we filter by emoji)
      if (state.category !== 'all') {
        if (getEmoji(ev.category) !== state.category) return false;
      }
      // Text search across title, venue, neighborhood
      if (q) {
        const hay = (ev.title + ' ' + ev.venue + ' ' + ev.neighborhood).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  
  /* =========================================================================
     Render: category filter row
     ========================================================================= */
  
  /* Build the round emoji buttons from the unique categories in EVENTS,
     plus a leading "All" pill button. */
  function renderCategories() {
    // Unique emoji set, preserving first-seen order
    const seen = new Set();
    const emojis = [];
    EVENTS.forEach(ev => {
      const e = getEmoji(ev.category);
      if (!seen.has(e)) { seen.add(e); emojis.push(e); }
    });
  
    els.categories.innerHTML = '';
  
    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn text' + (state.category === 'all' ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.setAttribute('aria-pressed', state.category === 'all');
    allBtn.addEventListener('click', () => setCategory('all'));
    els.categories.appendChild(allBtn);
  
    // One round button per unique emoji
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (state.category === emoji ? ' active' : '');
      btn.textContent = emoji;
      btn.setAttribute('aria-label', `Filter by ${emoji}`);
      btn.setAttribute('aria-pressed', state.category === emoji);
      btn.addEventListener('click', () => setCategory(emoji));
      els.categories.appendChild(btn);
    });
  }
  
  /* =========================================================================
     Render: active filter pills (below search)
     ========================================================================= */
  
  function renderActivePills() {
    els.activePills.innerHTML = '';
  
    if (state.category !== 'all') {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${state.category} <button class="pill-close" aria-label="Clear category">×</button>`;
      pill.querySelector('button').addEventListener('click', () => setCategory('all'));
      els.activePills.appendChild(pill);
    }
  
    if (state.search.trim()) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `"${state.search.trim()}" <button class="pill-close" aria-label="Clear search">×</button>`;
      pill.querySelector('button').addEventListener('click', () => {
        state.search = '';
        els.search.value = '';
        render();
      });
      els.activePills.appendChild(pill);
    }
  }
  
  /* =========================================================================
     Render: LIST VIEW
     ========================================================================= */
  
  /* Three shimmering placeholder rows to simulate loading. */
  function renderSkeleton() {
    els.listView.innerHTML = `
      <div class="event-list">
        ${[0,1,2].map(() => `
          <div class="skeleton-card" aria-hidden="true">
            <div class="skel skel-date"></div>
            <div class="skel-lines">
              <div class="skel skel-line med"></div>
              <div class="skel skel-line short"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /* Render the filtered events as cards. */
  function renderList() {
    const events = getFilteredEvents();
  
    if (events.length === 0) {
      els.listView.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <p>No events match your search</p>
        </div>
      `;
      return;
    }
  
    // Sort by start date (ascending)
    events.sort((a, b) => parseDate(a.date_start) - parseDate(b.date_start));
  
    const list = document.createElement('div');
    list.className = 'event-list';
  
    events.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'event-card';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
  
      const now = isHappeningNow(ev);
      const week = !now && isThisWeek(ev);
  
      // Editorial date: compact monospace, e.g. "Jun 1" or "Jun 7–9"
      const dateText = formatDateCompact(ev.date_start, ev.date_end);
  
      card.innerHTML = `
        <div class="event-date-col">${dateText}</div>
        <div class="event-body">
          <div class="event-title">
            ${now ? `<span class="now-dot" aria-label="Happening now">●</span>` : ''}
            <span>${escapeHtml(ev.title)}</span>
          </div>
          <div class="event-meta">${escapeHtml(ev.venue)} · ${escapeHtml(ev.neighborhood)}</div>
          <div class="event-bottom-row">
            ${ev.price ? `<span class="price-badge">${escapeHtml(ev.price)}</span>` : ''}
            ${week ? `<span class="badge-week">This Week</span>` : ''}
          </div>
        </div>
        <div class="chevron">›</div>
      `;
  
      card.addEventListener('click', () => openSheet(ev));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(ev); }
      });
  
      list.appendChild(card);
    });
  
    els.listView.innerHTML = '';
    els.listView.appendChild(list);
  }
  
  /* Minimal HTML escape for user-derived strings going into innerHTML. */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  
  /* =========================================================================
     Render: TIMELINE VIEW
     ========================================================================= */
  
  /* Build a horizontal timeline of the current month (TODAY's month).
     - Rows: one per venue (only venues with events in the current month).
     - Columns: each day of the month.
     - Bars: each event clipped to the visible month.
     - Today's column gets a vertical gold line overlay. */
  function renderTimeline() {
    const filtered = getFilteredEvents();
  
    // Anchor the timeline to TODAY's month
    const year = TODAY.getFullYear();
    const month = TODAY.getMonth();
    const monthStart = new Date(year, month, 1, 12);
    const monthEnd = new Date(year, month + 1, 0, 12); // last day of month
    const daysInMonth = monthEnd.getDate();
  
    // Keep only events that overlap the current month
    const monthEvents = filtered.filter(ev => {
      const s = parseDate(ev.date_start);
      const e = parseDate(ev.date_end);
      return e >= monthStart && s <= monthEnd;
    });
  
    if (monthEvents.length === 0) {
      els.timelineView.innerHTML = `
        <div class="empty-state">
          <div class="icon">📅</div>
          <p>No events this month match your filters</p>
        </div>
      `;
      return;
    }
  
    // Unique venues in display order
    const venueSet = new Set();
    const venues = [];
    monthEvents.forEach(ev => {
      if (!venueSet.has(ev.venue)) {
        venueSet.add(ev.venue);
        venues.push(ev.venue);
      }
    });
  
    // Layout constants
    const VENUE_COL_W = 140; // px
    const DAY_COL_W = 56;    // px
    const ROW_H = 56;        // px
    const HEADER_H = 48;     // px
    const BAR_H = 28;        // px
  
    // Build the grid container
    const wrap = document.createElement('div');
    wrap.className = 'timeline-wrap';
  
    const grid = document.createElement('div');
    grid.className = 'timeline';
    grid.style.gridTemplateColumns = `${VENUE_COL_W}px repeat(${daysInMonth}, ${DAY_COL_W}px)`;
    grid.style.gridTemplateRows = `${HEADER_H}px repeat(${venues.length}, ${ROW_H}px)`;
    grid.style.width = `${VENUE_COL_W + daysInMonth * DAY_COL_W}px`;
  
    // Month label in the top-left corner cell
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const corner = document.createElement('div');
    corner.className = 'tl-venue-cell corner';
    corner.textContent = monthLabel;
    grid.appendChild(corner);
  
    // Day header cells
    const todayDay = (TODAY.getFullYear() === year && TODAY.getMonth() === month) ? TODAY.getDate() : -1;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d, 12);
      const dow = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
      const cell = document.createElement('div');
      cell.className = 'tl-header-cell' + (d === todayDay ? ' today' : '');
      cell.innerHTML = `<span class="dow">${dow}</span><span class="day-num">${d}</span>`;
      grid.appendChild(cell);
    }
  
    // Venue rows: venue label + empty day cells
    venues.forEach(venue => {
      const venueCell = document.createElement('div');
      venueCell.className = 'tl-venue-cell';
      venueCell.textContent = venue;
      grid.appendChild(venueCell);
  
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'tl-row-cell';
        grid.appendChild(cell);
      }
    });
  
    wrap.appendChild(grid);
  
    // ---- Overlay layer for event bars + today line ----
    // Position bars absolutely inside the grid, positioned relative to the
    // grid's content box.
    grid.style.position = 'relative';
  
    monthEvents.forEach(ev => {
      const venueIdx = venues.indexOf(ev.venue);
      if (venueIdx === -1) return;
  
      // Clip event range to the current month
      const s = parseDate(ev.date_start);
      const e = parseDate(ev.date_end);
      const startDay = Math.max(1, s < monthStart ? 1 : s.getDate());
      const endDay = Math.min(daysInMonth, e > monthEnd ? daysInMonth : e.getDate());
  
      const left = VENUE_COL_W + (startDay - 1) * DAY_COL_W + 4;
      const width = (endDay - startDay + 1) * DAY_COL_W - 8;
      const top = HEADER_H + venueIdx * ROW_H + (ROW_H - BAR_H) / 2;
  
      const bar = document.createElement('button');
      bar.className = 'event-bar';
      bar.style.left = `${left}px`;
      bar.style.width = `${width}px`;
      bar.style.top = `${top}px`;
      bar.title = ev.title;
      bar.textContent = ev.title;
      bar.addEventListener('click', () => openSheet(ev));
  
      grid.appendChild(bar);
    });
  
    // Today vertical line
    if (todayDay > 0) {
      const line = document.createElement('div');
      line.className = 'today-line';
      line.style.left = `${VENUE_COL_W + (todayDay - 1) * DAY_COL_W + DAY_COL_W / 2 - 1}px`;
      grid.appendChild(line);
    }
  
    els.timelineView.innerHTML = '';
    els.timelineView.appendChild(wrap);
  }
  
  /* =========================================================================
     Bottom sheet modal
     ========================================================================= */
  
  /* Open the modal with full event details. */
  function openSheet(ev) {
    const now = isHappeningNow(ev);
  
    els.sheetContent.innerHTML = `
      <div class="sheet-header">
        <div class="sheet-cat">${escapeHtml(ev.category)}</div>
        <h2 class="sheet-title">
          ${escapeHtml(ev.title)}
          ${now ? `<span class="sheet-now">● Happening Now</span>` : ''}
        </h2>
      </div>
  
      <div class="sheet-detail">
        <div class="sheet-label">Venue</div>
        <div class="sheet-value">${escapeHtml(ev.venue)}</div>
        <div class="sheet-label">Neighborhood</div>
        <div class="sheet-value">${escapeHtml(ev.neighborhood)}</div>
        <div class="sheet-label">Dates</div>
        <div class="sheet-value">${formatDateRange(ev.date_start, ev.date_end)}</div>
        ${ev.price ? `
          <div class="sheet-label">Price</div>
          <div class="sheet-value">${escapeHtml(ev.price)}</div>
        ` : ''}
      </div>
  
      <div class="sheet-description">${escapeHtml(ev.description)}</div>
    `;
  
    els.modalBackdrop.classList.add('open');
    els.bottomSheet.classList.add('open');
    els.bottomSheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  
  /* Close the modal. */
  function closeSheet() {
    els.modalBackdrop.classList.remove('open');
    els.bottomSheet.classList.remove('open');
    els.bottomSheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  /* =========================================================================
     State setters & main render dispatcher
     ========================================================================= */
  
  function setCategory(emoji) {
    state.category = emoji;
    render();
  }
  
  function setView(view) {
    state.view = view;
    els.toggleBtns.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    els.listView.hidden = view !== 'list';
    els.timelineView.hidden = view !== 'timeline';
    render();
  }
  
  /* Master render — re-renders only the visible view + the pills. */
  function render() {
    renderCategories();
    renderActivePills();
  
    if (state.loading) {
      renderSkeleton();
      return;
    }
  
    if (state.view === 'list') {
      renderList();
    } else {
      renderTimeline();
    }
  }
  
  /* =========================================================================
     Event wiring
     ========================================================================= */
  
  // Search: filter as you type
  els.search.addEventListener('input', e => {
    state.search = e.target.value;
    render();
  });
  
  // View toggle
  els.toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  
  // Modal close
  els.modalBackdrop.addEventListener('click', closeSheet);
  els.sheetClose.addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
  });
  
  /* =========================================================================
     Boot: show skeleton for 600ms, then render
     ========================================================================= */
  render(); // initial render: skeleton
  setTimeout(() => {
    state.loading = false;
    render();
  }, 600);