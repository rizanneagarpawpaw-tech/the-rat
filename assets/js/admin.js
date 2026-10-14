/* ============================================================
   ADMIN PANEL — edits the portfolio database (db.json)
   Saves through the local server:  POST /api/data
   ============================================================ */

(() => {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const uid = () => "i" + Math.random().toString(36).slice(2, 9);

  const state = {
    data: null,
    dirty: false,
    online: false,     // local write API reachable?
    staticMode: false, // running on GitHub Pages / another static host
    tab: "profile",
  };

  /** current (non-dirty) status pill, restored whenever edits are saved */
  let statusBase = { cls: "status", html: '<span class="dot"></span> Ready' };

  const ICON_NAMES = ["sparkles", "code", "layers", "globe", "github", "linkedin", "dribbble", "x", "mail"];

  /* ====================================================== data helpers */
  const getPath = (path) =>
    path.split(".").reduce((o, k) => (o == null ? o : o[k]), state.data);

  const setPath = (path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], state.data);
    obj[last] = value;
    markDirty();
  };

  const val = (v) => esc(v == null ? "" : v);

  const asLines = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");

  /** remove empty strings / nulls from every array before saving */
  const clean = (node) => {
    if (Array.isArray(node)) {
      return node.map(clean).filter((v) => v !== "" && v !== null && v !== undefined);
    }
    if (node && typeof node === "object") {
      const out = {};
      Object.keys(node).forEach((k) => { out[k] = clean(node[k]); });
      return out;
    }
    return node;
  };

  const markDirty = () => {
    state.dirty = true;
    const s = $("#status");
    s.classList.add("dirty");
    s.innerHTML = '<span class="dot"></span> Unsaved changes';
  };

  const markClean = (msg) => {
    state.dirty = false;
    const s = $("#status");
    s.className = statusBase.cls;
    s.innerHTML = statusBase.html;
    if (msg) toast(msg);
  };

  /** remembered whenever the connection status changes */
  function setStatus(cls, html) {
    statusBase = { cls, html };
    const s = $("#status");
    s.className = cls;
    s.innerHTML = html;
  }

  /* ====================================================== field builders */
  const fid = (path) => "f_" + path.replace(/[^a-z0-9]/gi, "_");

  const fText = (label, path, opts = {}) => {
    const id = fid(path);
    return `
      <div class="field ${opts.full ? "field--full" : ""}">
        <label for="${id}">${esc(label)}${opts.req ? ' <span class="req">*</span>' : ""}</label>
        <input type="${opts.type || "text"}" id="${id}" data-path="${path}" value="${val(getPath(path))}"
               placeholder="${esc(opts.ph || "")}" ${opts.step ? `step="${opts.step}"` : ""}>
        ${opts.help ? `<span class="help">${esc(opts.help)}</span>` : ""}
      </div>`;
  };

  const fArea = (label, path, opts = {}) => `
    <div class="field ${opts.full === false ? "" : "field--full"}">
      <label for="${fid(path)}">${esc(label)}</label>
      <textarea id="${fid(path)}" data-path="${path}" rows="${opts.rows || 4}"
        placeholder="${esc(opts.ph || "")}">${val(getPath(path))}</textarea>
      ${opts.help ? `<span class="help">${esc(opts.help)}</span>` : ""}
    </div>`;

  const fLines = (label, path, opts = {}) => `
    <div class="field field--full">
      <label for="${fid(path)}">${esc(label)}</label>
      <textarea id="${fid(path)}" data-path="${path}" data-lines="1" rows="${opts.rows || 3}"
        placeholder="${esc(opts.ph || "One per line")}">${val(asLines(getPath(path)))}</textarea>
      <span class="help">One item per line</span>
    </div>`;

  const fColor = (label, path) => `
    <div class="field field--color">
      <input type="color" id="${fid(path)}" data-path="${path}" value="${val(getPath(path) || "#7c5cff")}">
      <div style="flex:1">
        <label for="${fid(path)}">${esc(label)}</label>
        <input type="text" data-path="${path}" value="${val(getPath(path))}" placeholder="#7c5cff">
      </div>
    </div>`;

  const fToggle = (label, path) => `
    <div class="field">
      <label class="toggle">
        <input type="checkbox" data-path="${path}" ${getPath(path) ? "checked" : ""}>
        <span class="toggle__track"></span>
        <span>${esc(label)}</span>
      </label>
    </div>`;

  const fBool = (label, path) => `
    <div class="field">
      <label for="${fid(path)}">${esc(label)}</label>
      <select id="${fid(path)}" data-path="${path}" data-bool="1">
        <option value="true" ${getPath(path) ? "selected" : ""}>Featured</option>
        <option value="false" ${getPath(path) ? "" : "selected"}>Normal</option>
      </select>
    </div>`;

  const fColors = (label, basePath) => `
    <div class="field field--full">
      <label>${esc(label)}</label>
      <div style="display:flex; gap:12px">
        ${["0", "1"].map((n, k) => {
          const path = `${basePath}.${n}`;
          const hex = getPath(path) || (k ? "#22d3ee" : "#7c5cff");
          return `
            <div class="field field--color" style="flex:1">
              <input type="color" data-path="${path}" value="${val(hex)}">
              <div style="flex:1">
                <label>${k ? "To" : "From"}</label>
                <input type="text" data-path="${path}" value="${val(getPath(path))}" placeholder="${esc(hex)}">
              </div>
            </div>`;
        }).join("")}
      </div>
    </div>`;

  const fSelect = (label, path, options) => {
    const current = getPath(path);
    return `
      <div class="field">
        <label for="${fid(path)}">${esc(label)}</label>
        <select id="${fid(path)}" data-path="${path}">
          ${options.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select>
      </div>`;
  };

  /* ====================================================== list editor */
  function listEditor(cfg) {
    const items = state.data[cfg.key] || [];
    const body = items.map((item, i) => {
      const meta = cfg.meta ? cfg.meta(item) : "";
      return `
        <div class="item" data-list="${cfg.key}" data-i="${i}">
          <div class="item__head">
            <span class="item__grip">⋮⋮</span>
            <span class="badge-dot"></span>
            <span class="item__title">${esc(cfg.title(item) || "Untitled")}</span>
            ${meta ? `<span class="item__meta">${esc(meta)}</span>` : ""}
            <div class="item__actions">
              <button class="iconbtn" data-act="up" title="Move up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
              <button class="iconbtn" data-act="down" title="Move down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>
              <button class="iconbtn" data-act="dup" title="Duplicate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15V6a3 3 0 0 1 3-3h9"/></svg></button>
              <button class="iconbtn danger" data-act="del" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
            </div>
          </div>
          <div class="item__body"><div class="fields">${cfg.fields(item, i)}</div></div>
        </div>`;
    }).join("");

    return `
      <div class="panel__head">
        <h1 class="panel__title">${esc(cfg.heading)}</h1>
        <p class="panel__hint">${esc(cfg.hint)}</p>
      </div>
      <div id="list_${cfg.key}">
        ${items.length ? body : '<div class="card"><p class="panel__hint">Nothing here yet — add your first one below.</p></div>'}
      </div>
      <div class="addrow">
        <button class="btn btn--primary" data-add="${cfg.key}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          ${esc(cfg.addLabel)}
        </button>
      </div>`;
  }

  /* ====================================================== panels */
  const panels = {
    profile: () => {
      const p = state.data.profile || {};
      return `
        <div class="panel__head">
          <h1 class="panel__title">Profile</h1>
          <p class="panel__hint">Who you are — shown in the hero, navigation and page title.</p>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Identity</span></div>
          <div class="fields">
            ${fText("Full name", "profile.name", { req: true, ph: "Aria Vale" })}
            ${fText("Role / job title", "profile.role", { req: true, ph: "Creative Developer" })}
            ${fText("Greeting line", "profile.intro", { ph: "Hello, I'm" })}
            ${fText("Location", "profile.location", { ph: "Lisbon, Portugal" })}
            ${fArea("Tagline", "profile.tagline", { rows: 2, ph: "One line under your name" })}
            ${fArea("Bio", "profile.bio", { rows: 6, ph: "A few paragraphs about you" })}
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Contact & files</span></div>
          <div class="fields">
            ${fText("Email", "profile.email", { type: "email", ph: "you@example.com" })}
            ${fText("Phone", "profile.phone", { ph: "Optional" })}
            ${fText("Avatar image URL", "profile.avatar", { full: true, ph: "https://… — leave empty to show your initials" })}
            ${fText("CV / resume URL", "profile.resumeUrl", { full: true, ph: "https://…/resume.pdf" })}
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Availability badge</span></div>
          <div class="fields">
            ${fText("Status", "profile.availability", { ph: "Available for freelance projects" })}
            ${fText("Extra note", "profile.availabilityNote", { ph: "Booking work for Q1 2027" })}
          </div>
        </div>`;
    },

    stats: () => listEditor({
      key: "stats",
      heading: "Stats",
      hint: "The four numbers shown right under the hero.",
      addLabel: "Add stat",
      title: (s) => s.value || "—",
      meta: (s) => s.label,
      fields: (s, idx) => `
        ${fText("Value", `stats.${idx}.value`, { ph: "8+" })}
        ${fText("Label", `stats.${idx}.label`, { ph: "Years of experience" })}`,
    }),

    skills: () => listEditor({
      key: "skills",
      heading: "Skills",
      hint: "Shown as animated bars in the About section, plus the floating hero chips.",
      addLabel: "Add skill",
      title: (s) => s.name || "—",
      meta: (s) => `${s.level ?? 0}%`,
      fields: (s, idx) => `
        ${fText("Skill", `skills.${idx}.name`, { ph: "React / Next.js" })}
        ${fText("Category", `skills.${idx}.category`, { ph: "Frontend" })}
        <div class="field field--full">
          <label for="lvl_${idx}">Level — <span id="lvlnum_${idx}">${Number(s.level) || 0}%</span></label>
          <input type="range" id="lvl_${idx}" data-path="skills.${idx}.level" data-num="1" min="0" max="100" value="${Number(s.level) || 0}"
                 oninput="document.getElementById('lvlnum_${idx}').textContent = this.value + '%'">
        </div>`,
    }),

    services: () => listEditor({
      key: "services",
      heading: "Services",
      hint: "Cards describing what you offer.",
      addLabel: "Add service",
      title: (s) => s.title || "—",
      meta: (s) => s.icon,
      fields: (s, idx) => `
        ${fText("Title", `services.${idx}.title`, { ph: "Product Design" })}
        ${fSelect("Icon", `services.${idx}.icon`, ICON_NAMES)}
        ${fArea("Description", `services.${idx}.description`, { rows: 3 })}
        ${fLines("Bullet points", `services.${idx}.points`, { rows: 3 })}`,
    }),

    projects: () => listEditor({
      key: "projects",
      heading: "Projects",
      hint: "Your work grid. Featured projects appear first and span the full width.",
      addLabel: "Add project",
      title: (p) => p.title || "—",
      meta: (p) => `${p.featured ? "★ Featured · " : ""}${p.year || ""}`,
      fields: (p, idx) => `
        ${fText("Title", `projects.${idx}.title`, { req: true, ph: "Lumen" })}
        ${fText("Subtitle", `projects.${idx}.subtitle`, { ph: "Adaptive design system" })}
        ${fText("Year", `projects.${idx}.year`, { ph: "2026" })}
        ${fArea("Description", `projects.${idx}.description`, { rows: 3 })}
        ${fLines("Tags", `projects.${idx}.tags`, { rows: 2, ph: "React, TypeScript" })}
        ${fColors("Cover colours", `projects.${idx}.gradient`)}
        ${fText("Cover image URL", `projects.${idx}.image`, { full: true, ph: "Optional — a gradient cover is generated instead" })}
        ${fBool("Placement", `projects.${idx}.featured`)}
        ${fText("Live demo URL", `projects.${idx}.liveUrl`, { ph: "https://…" })}
        ${fText("Source code URL", `projects.${idx}.sourceUrl`, { ph: "https://github.com/…" })}`,
    }),

    experience: () => listEditor({
      key: "experience",
      heading: "Experience",
      hint: "Your career timeline, newest first.",
      addLabel: "Add position",
      title: (j) => j.role || "—",
      meta: (j) => j.company,
      fields: (j, idx) => `
        ${fText("Role", `experience.${idx}.role`, { ph: "Lead Design Engineer" })}
        ${fText("Company", `experience.${idx}.company`, { ph: "Northwind Studio" })}
        ${fText("Period", `experience.${idx}.period`, { ph: "2023 — Present" })}
        ${fText("Location", `experience.${idx}.location`, { ph: "Remote" })}
        ${fArea("Summary", `experience.${idx}.summary`, { rows: 2 })}
        ${fLines("Highlights", `experience.${idx}.highlights`, { rows: 4 })}`,
    }),

    testimonials: () => listEditor({
      key: "testimonials",
      heading: "Testimonials",
      hint: "Quotes from people you've worked with.",
      addLabel: "Add testimonial",
      title: (t) => t.name || "—",
      meta: (t) => t.role,
      fields: (t, idx) => `
        ${fArea("Quote", `testimonials.${idx}.quote`, { rows: 4 })}
        ${fText("Name", `testimonials.${idx}.name`, { ph: "Maya Okonkwo" })}
        ${fText("Role / company", `testimonials.${idx}.role`, { ph: "Head of Product, Northwind" })}
        ${fColors("Avatar colours", `testimonials.${idx}.gradient`)}`,
    }),

    socials: () => listEditor({
      key: "socials",
      heading: "Links",
      hint: "Social buttons shown in the contact section.",
      addLabel: "Add link",
      title: (l) => l.label || "—",
      meta: (l) => l.url,
      fields: (l, idx) => `
        ${fText("Label", `socials.${idx}.label`, { ph: "GitHub" })}
        ${fSelect("Icon", `socials.${idx}.icon`, ICON_NAMES)}
        ${fText("URL", `socials.${idx}.url`, { full: true, ph: "https://github.com/yourname" })}`,
    }),

    settings: () => {
      const s = state.data.settings || {};
      return `
        <div class="panel__head">
          <h1 class="panel__title">Settings</h1>
          <p class="panel__hint">Colours, section visibility and contact call-to-action.</p>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Theme colours</span></div>
          <div class="fields">
            ${fColor("Primary accent", "settings.accent")}
            ${fColor("Secondary accent", "settings.accent2")}
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Sections</span></div>
          <div class="fields">
            ${fToggle("Show availability badge", "settings.showAvailability")}
            ${fToggle("Show stats row", "settings.showStats")}
            ${fToggle("Show services", "settings.showServices")}
            ${fToggle("Show testimonials", "settings.showTestimonials")}
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">Contact & footer</span></div>
          <div class="fields">
            ${fText("CTA headline", "settings.ctaLabel", { ph: "Let's build something" })}
            ${fArea("CTA text", "settings.ctaText", { rows: 3 })}
            ${fArea("Footer note", "settings.footerNote", { rows: 2, ph: "© 2026 Your Name" })}
            ${fArea("SEO description", "settings.seoDescription", { rows: 2 })}
          </div>
        </div>`;
    },

    data: () => `
      <div class="panel__head">
        <h1 class="panel__title">Raw database</h1>
        <p class="panel__hint">The contents of <code>db.json</code> — the file the portfolio reads.</p>
      </div>
      <div class="card">
        <textarea class="jsonbox" id="jsonbox" spellcheck="false"></textarea>
        <div class="addrow" style="margin-top:14px">
          <button class="btn btn--primary" id="applyJson">Apply to editor</button>
          <button class="btn" id="copyJson">Copy JSON</button>
          <button class="btn" id="downloadJson">Download db.json</button>
          <label class="btn" for="importFile" style="cursor:pointer">Import file…</label>
          <input type="file" id="importFile" accept="application/json,.json" hidden>
          <button class="btn btn--danger" id="resetDb">Reset to defaults</button>
        </div>
      </div>
      <div class="card">
        <div class="card__head"><span class="card__title">How it fits together</span></div>
        <p class="panel__hint" style="line-height:1.8">
          <code>index.html</code> reads <code>db.json</code> and renders everything you see here.<br>
          <code>db.seed.json</code> is the untouched backup used by “Reset to defaults”.<br>
          <b>Local server</b> (<code>start.bat</code>) → editing and <b>Save</b> rewrites <code>db.json</code> instantly.<br>
          <b>GitHub Pages</b> serves the same files read-only → <b>Download db.json</b> and commit it to publish your changes.
        </p>
      </div>`,
  };

  /* ====================================================== render */
  function renderTab() {
    const key = state.tab;
    $("#panel").innerHTML = panels[key]();
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === key));

    // keep the raw JSON box in sync when opened
    if (key === "data") syncJsonBox();
  }

  function renderCounts() {
    $$(".tab").forEach((t) => {
      const key = t.dataset.tab;
      const list = state.data[key];
      const badge = $(".count", t);
      if (badge) {
        badge.textContent = Array.isArray(list) ? list.length : "";
        badge.hidden = !Array.isArray(list) || !list.length;
      }
    });
  }

  function syncJsonBox() {
    const box = $("#jsonbox");
    if (box) box.value = JSON.stringify(state.data, null, 2);
  }

  /* ====================================================== toasts + modal */
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $("#toast");
    t.className = "toast show" + (isError ? " err" : "");
    t.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function askKey(message, onOk) {
    const modal = $("#keyModal");
    $("#keyModalText").textContent = message;
    $("#keyInput").value = localStorage.getItem("adminKey") || "";
    modal.classList.add("open");
    $("#keyOk").onclick = () => {
      const key = $("#keyInput").value.trim();
      if (!key) { toast("Enter the admin key", true); return; }
      localStorage.setItem("adminKey", key);
      modal.classList.remove("open");
      onOk(key);
    };
    $("#keyCancel").onclick = () => modal.classList.remove("open");
    setTimeout(() => $("#keyInput").focus(), 50);
  }

  function confirmAction(title, text, actionLabel, onOk) {
    const modal = $("#confirmModal");
    $("#confirmTitle").textContent = title;
    $("#confirmText").textContent = text;
    $("#confirmOk").textContent = actionLabel;
    modal.classList.add("open");
    $("#confirmOk").onclick = () => { modal.classList.remove("open"); onOk(); };
    $("#confirmCancel").onclick = () => modal.classList.remove("open");
  }

  /* ====================================================== server calls */
  async function api(path, options = {}) {
    const res = await fetch(path, {
      cache: "no-store",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const text = await res.text();
    let body = {};
    try { body = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  }

  async function save() {
    // static hosting (GitHub Pages …): no server can write the file,
    // so hand the user the edited database to commit instead.
    if (!state.online) {
      downloadJson();
      state.tab = "data";
      renderTab();
      markClean();
      toast("No server here — db.json downloaded. Commit it to your repository to publish.");
      return;
    }

    const payload = clean(state.data);
    const doSave = async (key) => {
      try {
        await api("./api/data", {
          method: "POST",
          headers: { "x-admin-key": key },
          body: JSON.stringify(payload, null, 2),
        });
        state.data = payload;
        renderCounts();
        markClean("✓ Saved — reload the portfolio to see it live");
      } catch (err) {
        if (/admin key|401|Unauthorized/i.test(err.message)) {
          askKey("That key was rejected. Try again:", (k) => doSave(k));
        } else {
          toast(`Save failed: ${err.message}`, true);
        }
      }
    };

    const key = localStorage.getItem("adminKey");
    if (!key) askKey("Enter the admin key to save changes (default: portfolio-admin)", doSave);
    else doSave(key);
  }

  async function resetDatabase() {
    // static hosting: load the seed backup into the editor (the file is still
    // served read-only); the user downloads it to publish the reset.
    if (!state.online) {
      confirmAction(
        "Load the original content?",
        "This replaces what's in the editor with db.seed.json. Nothing is written here — you'd download the result to publish it.",
        "Load seed",
        async () => {
          try {
            state.data = await loadJson("./db.seed.json");
            renderCounts();
            renderTab();
            markDirty();
            toast("Seed loaded into the editor — press Download db.json to keep it");
          } catch (err) {
            toast(`Couldn't read db.seed.json: ${err.message}`, true);
          }
        }
      );
      return;
    }

    confirmAction(
      "Reset the database?",
      "This restores db.seed.json — the original content. Your current edits in db.json will be lost.",
      "Reset",
      async () => {
        const doReset = async (k) => {
          try {
            await api("./api/reset", { method: "POST", headers: { "x-admin-key": k } });
            await loadData();
            toast("✓ Database restored to the original content");
          } catch (err) {
            if (/admin key|401|Unauthorized/i.test(err.message)) askKey("Enter the admin key:", doReset);
            else toast(`Reset failed: ${err.message}`, true);
          }
        };
        const key = localStorage.getItem("adminKey");
        if (!key) askKey("Enter the admin key to reset (default: portfolio-admin)", doReset);
        else doReset(key);
      }
    );
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Not a JSON object");
    return data;
  }

  function showStaticBanner() {
    const banner = $("#banner");
    const host = location.hostname || "this host";
    banner.innerHTML = `
      <b>Read-only mode.</b> This copy of the admin panel is on static hosting
      (${esc(host)}), so there is no server available to write <code>db.json</code> —
      GitHub Pages can only serve files.<br><br>
      To make a change: edit below, open the <b>Raw data</b> tab, press
      <b>Download db.json</b>, then commit the downloaded file to your repository.
      Running <code>start.bat</code> locally gives you live saving instead.`;
    banner.classList.add("show");
  }

  /** hosts that are definitely static — skip the pointless API probe
      (avoids a console 404 on GitHub Pages) */
  const STATIC_HOST_RE = /(\.github\.io|\.githubusercontent\.com|\.netlify\.app|\.vercel\.app|\.surge\.sh|\.render\.com)$/;

  async function detectServer() {
    if (location.protocol === "file:" || STATIC_HOST_RE.test(location.hostname)) return false;
    try {
      const probe = await fetch("./api/data", { cache: "no-store" });
      return probe.ok;
    } catch {
      return false;
    }
  }

  async function loadData() {
    setStatus("status", '<span class="dot"></span> Connecting…');

    // 1) the static database file — works on the local server, GitHub Pages
    //    and any other static host, without a console 404
    // 2) the local server API, as a fallback
    try {
      state.data = await loadJson("./db.json");
    } catch {
      try {
        state.data = await loadJson("./api/data");
      } catch {
        try {
          state.data = await loadJson("./api/seed");
          toast("Couldn't read db.json — showing the seed backup instead", true);
        } catch {
          setStatus("status bad", '<span class="dot"></span> No data');
          $("#panel").innerHTML =
            '<div class="card"><p class="panel__hint">Could not load <code>db.json</code>. ' +
            'Start the server with <code>start.bat</code> and reload — or, on GitHub Pages, ' +
            'make sure <code>db.json</code> is committed to the repository.</p></div>';
          return false;
        }
      }
    }

    state.online = await detectServer();
    state.staticMode = !state.online;

    if (state.online) {
      setStatus("status ok", '<span class="dot"></span> Connected · live saving');
      $("#banner").classList.remove("show");
      $("#saveBtn").innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        Save`;
    } else {
      setStatus("status bad", '<span class="dot"></span> Read-only · static hosting');
      showStaticBanner();
      $("#saveBtn").innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 12l5 5 5-5M5 21h14"/></svg>
        Download db.json`;
    }
    $("#saveBtn").disabled = false;

    // apply theme colours to the admin chrome
    const s = state.data.settings || {};
    if (s.accent) document.documentElement.style.setProperty("--accent", s.accent);
    if (s.accent2) document.documentElement.style.setProperty("--accent-2", s.accent2);

    renderCounts();
    renderTab();
    markClean();
    return true;
  }

  /* ====================================================== events */
  function bindEvents() {
    // sidebar tabs
    $(".sidebar").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      state.tab = tab.dataset.tab;
      renderTab();
    });

    // typing into any bound field
    $("#panel").addEventListener("input", (e) => {
      const el = e.target.closest("[data-path]");
      if (!el) return;
      const path = el.dataset.path;

      let value;
      if (el.type === "checkbox") value = el.checked;
      else if (el.dataset.bool) value = el.value === "true";
      else if (el.dataset.num || el.type === "range" || el.type === "number") value = Number(el.value);
      else if (el.dataset.lines) value = el.value.split("\n");
      else value = el.value;

      // keep the sibling color text input in sync
      setPath(path, value);
      if (el.type === "color") {
        const twin = Array.from(document.querySelectorAll(`[data-path="${path}"]`)).find((n) => n !== el);
        if (twin) twin.value = value;
      }
    });

    // list item actions (open / move / duplicate / delete) + add buttons
    $("#panel").addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        const key = addBtn.dataset.add;
        const blank = blankFor(key);
        state.data[key] = state.data[key] || [];
        state.data[key].push(blank);
        markDirty();
        renderTab();
        const items = $$(`.item[data-list="${key}"]`);
        const last = items[items.length - 1];
        if (last) {
          last.classList.add("open");
          last.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      const actBtn = e.target.closest("[data-act]");
      const item = e.target.closest(".item");

      if (actBtn && item) {
        e.stopPropagation();
        const key = item.dataset.list;
        const idx = Number(item.dataset.i);
        const list = state.data[key];
        const act = actBtn.dataset.act;

        if (act === "up" && idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; }
        if (act === "down" && idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; }
        if (act === "dup") { list.splice(idx + 1, 0, JSON.parse(JSON.stringify(list[idx]))); }
        if (act === "del") {
          confirmAction("Delete this item?", `“${list[idx]?.title || list[idx]?.name || list[idx]?.value || "Item"}” will be removed. You can undo by not saving.`, "Delete", () => {
            list.splice(idx, 1);
            markDirty();
            renderTab();
          });
          return;
        }
        markDirty();
        renderTab();
        return;
      }

      if (item) item.classList.toggle("open");
    });

    // topbar actions
    $("#saveBtn").addEventListener("click", save);

    $("#previewBtn").addEventListener("click", () => window.open("index.html", "_blank"));

    $("#exportBtn").addEventListener("click", downloadJson);

    $("#importBtn").addEventListener("click", () => $("#importFileTop").click());
    $("#importFileTop").addEventListener("change", importFile);

    // raw JSON panel
    $("#panel").addEventListener("click", (e) => {
      if (e.target.id === "applyJson") {
        try {
          const parsed = JSON.parse($("#jsonbox").value);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Root must be an object");
          state.data = parsed;
          markDirty();
          renderCounts();
          toast("JSON applied to the editor — press Save to write it to db.json");
        } catch (err) {
          toast(`Invalid JSON: ${err.message}`, true);
        }
      }
      if (e.target.id === "copyJson") {
        navigator.clipboard.writeText($("#jsonbox").value)
          .then(() => toast("JSON copied to clipboard"))
          .catch(() => toast("Copy failed — select the text manually", true));
      }
      if (e.target.id === "downloadJson") downloadJson();
      if (e.target.id === "resetDb") resetDatabase();
    });

    $("#panel").addEventListener("change", (e) => {
      if (e.target.id === "importFile") importFile(e);
    });

    // warn before losing edits
    window.addEventListener("beforeunload", (e) => {
      if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
    });

    // modal: enter submits
    $("#keyInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#keyOk").click(); });
    $$(".modal").forEach((m) => m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    }));
  }

  function blankFor(key) {
    const map = {
      stats:         { id: uid(), value: "", label: "" },
      skills:        { id: uid(), name: "", category: "", level: 80 },
      services:      { id: uid(), title: "", icon: "sparkles", description: "", points: [] },
      projects:      { id: uid(), title: "", subtitle: "", description: "", year: String(new Date().getFullYear()), tags: [], gradient: ["#7c5cff", "#22d3ee"], image: "", liveUrl: "", sourceUrl: "", featured: false },
      experience:    { id: uid(), role: "", company: "", period: "", location: "", summary: "", highlights: [] },
      testimonials:  { id: uid(), quote: "", name: "", role: "", gradient: ["#7c5cff", "#22d3ee"] },
      socials:       { id: uid(), label: "", icon: "globe", url: "" },
    };
    return map[key] || { id: uid() };
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(clean(state.data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "db.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("db.json downloaded");
  }

  function importFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Root must be an object");
        state.data = parsed;
        markDirty();
        renderCounts();
        renderTab();
        toast(`Imported ${file.name} — press Save to write it to db.json`);
      } catch (err) {
        toast(`Import failed: ${err.message}`, true);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  /* ====================================================== boot */
  document.addEventListener("DOMContentLoaded", async () => {
    bindEvents();
    const ok = await loadData();
    if (!ok) return;
  });
})();
