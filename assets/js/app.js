/* ============================================================
   PORTFOLIO — renders index.html from the database file (db.json)
   Loaded through the local server (GET /api/data).
   ============================================================ */

(() => {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  /* ----------------------------------------------------- icons */
  const ICONS = {
    github:    "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A10 10 0 0 0 12 2Z",
    linkedin:  "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21h-4V9Z",
    dribbble:  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.6 4.6a8.3 8.3 0 0 1 1.9 5.2c-.3-.06-3.3-.67-6.3-.3l-.4-1c3-1.2 4.3-3 4.8-3.9ZM12 3.5c2.1 0 4 .8 5.4 2.1-.4.6-1.6 2.3-4.5 3.4A43 43 0 0 0 9.7 4c.7-.3 1.5-.5 2.3-.5ZM7.9 4.7c.5.7 1.9 2.6 3.2 5-3.9 1-7.3 1-7.7 1a8.5 8.5 0 0 1 4.5-6ZM3.5 12v-.3c.4 0 4.5.1 8.7-1.2l.6 1.2c-3.6 1-6.6 4.2-7.4 5.2A8.4 8.4 0 0 1 3.5 12Zm4 7.3c.6-.9 2.9-3.8 6.5-5 1 2.6 1.4 4.8 1.5 5.4a8.4 8.4 0 0 1-8-.4Zm9.7-.6c-.1-.6-.4-2.6-1.3-5.1 2.8-.4 5.2.3 5.5.4a8.4 8.4 0 0 1-4.2 4.7Z",
    x:         "M17.5 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2 3h6.4l4.4 5.9L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z",
    mail:      "M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.4-.3 6.6 4.7 6.6-4.7H5.4Z",
    sparkles:  "m12 3 1.9 4.9L19 9.8l-5.1 1.9L12 16.6l-1.9-4.9L5 9.8l5.1-1.9L12 3Zm7 10.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3ZM5.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z",
    code:      "m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4l-3 16",
    layers:    "m12 3 9 5-9 5-9-5 9-5Zm9 9.5-9 5-9-5m18 4.5-9 5-9-5",
    globe:     "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3a15 15 0 0 0-1.4-3.3A8 8 0 0 1 18.9 8ZM12 4.1c.8 1 1.5 2.4 1.9 3.9h-3.8c.4-1.5 1.1-2.9 1.9-3.9ZM4.3 14a8 8 0 0 1 0-4h3.4a17 17 0 0 0 0 4H4.3Zm.8 2h3a15 15 0 0 0 1.4 3.3A8 8 0 0 1 5.1 16Zm3-8h-3a8 8 0 0 1 4.4-3.3A15 15 0 0 0 8.1 8ZM12 19.9c-.8-1-1.5-2.4-1.9-3.9h3.8c-.4 1.5-1.1 2.9-1.9 3.9Zm2.2-5.9H9.8a15 15 0 0 1 0-4h4.4a15 15 0 0 1 0 4Zm.3 5.3a15 15 0 0 0 1.4-3.3h3a8 8 0 0 1-4.4 3.3Zm1.7-5.3a17 17 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4Z",
    pin:       "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
    external:  "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  };

  const icon = (name, size = 18) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name] || ICONS.globe}"/></svg>`;

  const iconFilled = (name, size = 16) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${ICONS[name] || ICONS.globe}"/></svg>`;

  const initialsOf = (name) =>
    String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();

  const gradient = (pair) =>
    Array.isArray(pair) && pair.length >= 2
      ? `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`
      : "linear-gradient(135deg, var(--accent), var(--accent-2))";

  /* ------------------------------------------------- load data
     Works in three situations:
       · local server   -> db.json (served fresh) or /api/data
       · GitHub Pages   -> db.json (a plain static file)
       · any static host -> db.json
     The static file is tried first so static hosting never logs a 404. */
  async function loadData() {
    const tries = ["./db.json", "./api/data"];
    for (const url of tries) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object" && !Array.isArray(data)) return data;
        }
      } catch (err) { /* try next source */ }
    }
    return null;
  }

  /* --------------------------------------------------- renderers */
  function applyTheme(data) {
    const s = data.settings || {};
    if (s.accent) document.documentElement.style.setProperty("--accent", s.accent);
    if (s.accent2) document.documentElement.style.setProperty("--accent-2", s.accent2);
  }

  function renderChrome(data) {
    const p = data.profile || {};
    const s = data.settings || {};

    document.title = `${p.name || "Portfolio"} — ${p.role || ""}`.trim();
    if (s.seoDescription) $("#seoDesc").setAttribute("content", s.seoDescription);

    const mark = initialsOf(p.name);
    $("#navMark").textContent = mark;
    $("#navName").textContent = p.name || "";
    $("#heroIntro").textContent = p.intro || "Hello, I'm";
    $("#heroName").textContent = p.name || "";
    $("#heroTagline").textContent = p.tagline || "";

    if (p.avatar) {
      $("#avatarInner").innerHTML = `<img src="${esc(p.avatar)}" alt="${esc(p.name)}" onerror="this.remove()">` +
        `<span class="avatar__initials" style="position:absolute">${esc(mark)}</span>`;
    } else {
      $("#avatarInner").innerHTML = `<span class="avatar__initials">${esc(mark)}</span>`;
    }

    const badge = $("#availability");
    if (s.showAvailability !== false && p.availability) {
      $("#availabilityText").textContent = p.availabilityNote
        ? `${p.availability} · ${p.availabilityNote}`
        : p.availability;
      badge.hidden = false;
    }

    $("#locationText").textContent = p.location || "";
    $("#emailText").textContent = p.email || "";
    $("#metaLocation").hidden = !p.location;
    $("#metaEmail").hidden = !p.email;

    if (p.resumeUrl && p.resumeUrl !== "#") {
      $("#resumeBtn").href = p.resumeUrl;
    } else {
      $("#resumeBtn").remove();
    }

    $("#ctaTitle").textContent = s.ctaLabel || "Let's work together";
    $("#ctaText").textContent = s.ctaText || "";
    $("#footerNote").textContent = s.footerNote || `© ${new Date().getFullYear()} ${p.name || ""}`;

    // hero chips = first skills
    const skills = (data.skills || []).slice(0, 4);
    [1, 2, 3, 4].forEach((n) => {
      const chip = $(`#chip${n}`);
      const skill = skills[n - 1];
      if (skill && skill.name) chip.textContent = skill.name.split("/")[0].trim();
      else chip.remove();
    });
  }

  function renderStats(data) {
    const wrap = $("#stats");
    const list = data.stats || [];
    if (data.settings && data.settings.showStats === false) { wrap.remove(); return; }
    wrap.innerHTML = list.map((s, i) => `
      <div class="stat reveal" style="--d:${i * 0.07}s">
        <div class="stat__value">${esc(s.value)}</div>
        <div class="stat__label">${esc(s.label)}</div>
      </div>`).join("");
  }

  function renderMarquee(data) {
    const words = [
      ...(data.skills || []).map((k) => k.name),
      ...(data.services || []).map((v) => v.title),
    ].slice(0, 12);
    const html = words.map((w) => `<span>${esc(w)}</span><i></i>`).join("");
    $("#marqueeA").innerHTML = html;
    $("#marqueeB").innerHTML = html;
  }

  function renderProjects(data) {
    const grid = $("#projects");
    const list = data.projects || [];
    const featuredFirst = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));

    grid.innerHTML = featuredFirst.map((p, i) => {
      const wide = p.featured && i < 3 ? " project--wide" : "";
      const cover = p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`
        : `<span class="project__mono">${esc(initialsOf(p.title))}</span>
           <span class="project__pattern"></span>`;

      const links = [
        p.liveUrl ? `<a href="${esc(p.liveUrl)}" target="_blank" rel="noopener">${icon("external", 15)} Live demo</a>` : "",
        p.sourceUrl ? `<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${iconFilled("github", 15)} Source</a>` : "",
      ].join("");

      const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

      return `
        <article class="project${wide} reveal" style="--d:${(i % 3) * 0.08}s" data-tags="${esc((p.tags || []).join("|").toLowerCase())}">
          <div class="project__cover" style="background:${gradient(p.gradient)}">
            ${cover}
            <span class="project__shine"></span>
            ${p.year ? `<span class="project__year">${esc(p.year)}</span>` : ""}
          </div>
          <div class="project__body">
            <div class="project__head">
              <h3 class="project__title">${esc(p.title)}</h3>
              ${p.subtitle ? `<span class="project__subtitle">${esc(p.subtitle)}</span>` : ""}
            </div>
            <p class="project__desc">${esc(p.description)}</p>
            ${tags ? `<div class="tags">${tags}</div>` : ""}
            ${links ? `<div class="project__links">${links}</div>` : ""}
          </div>
        </article>`;
    }).join("");

    // filter chips from unique tags
    const all = [...new Set(list.flatMap((p) => p.tags || []))];
    const filters = $("#filters");
    if (all.length > 1) {
      filters.innerHTML = ["All", ...all]
        .map((t, i) => `<button class="filter${i === 0 ? " active" : ""}" data-filter="${esc(t.toLowerCase())}">${esc(t)}</button>`)
        .join("");
      filters.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter");
        if (!btn) return;
        $$(".filter", filters).forEach((b) => b.classList.toggle("active", b === btn));
        const val = btn.dataset.filter;
        $$(".project", grid).forEach((card) => {
          const show = val === "all" || card.dataset.tags.split("|").includes(val);
          card.classList.toggle("hidden", !show);
        });
      });
    } else {
      filters.remove();
    }
  }

  function renderServices(data) {
    const wrap = $("#services-grid");
    const list = data.services || [];
    const section = $("#services");
    if (data.settings && data.settings.showServices === false) { section.remove(); return; }
    if (!list.length) { section.remove(); return; }

    wrap.innerHTML = list.map((s, i) => `
      <article class="card reveal" style="--d:${i * 0.09}s">
        <div class="card__icon">${icon(s.icon || "sparkles", 22)}</div>
        <h3 class="card__title">${esc(s.title)}</h3>
        <p class="card__text">${esc(s.description)}</p>
        ${(s.points || []).length ? `<ul class="list">${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      </article>`).join("");
  }

  function renderAbout(data) {
    const p = data.profile || {};
    $("#aboutText").innerHTML = String(p.bio || "")
      .split(/\n{2,}|\n/)
      .filter(Boolean)
      .map((para) => `<p>${esc(para)}</p>`)
      .join("");

    $("#skills").innerHTML = (data.skills || []).map((k) => `
      <div class="skill">
        <div class="skill__top">
          <span class="skill__name">${esc(k.name)}<span class="skill__cat">${esc(k.category || "")}</span></span>
          <span class="skill__val">${Number(k.level) || 0}%</span>
        </div>
        <div class="skill__bar"><span class="skill__fill" data-level="${Number(k.level) || 0}"></span></div>
      </div>`).join("");
  }

  function renderExperience(data) {
    $("#timeline").innerHTML = (data.experience || []).map((j, i) => `
      <div class="job reveal" style="--d:${i * 0.07}s">
        <div class="job__card">
          <div class="job__top">
            <span class="job__role">${esc(j.role)}
              <span class="job__company"> · ${esc(j.company)}</span>
            </span>
            <span class="job__period">${esc(j.period)}${j.location ? ` · ${esc(j.location)}` : ""}</span>
          </div>
          ${j.summary ? `<p class="job__summary">${esc(j.summary)}</p>` : ""}
          ${(j.highlights || []).length ? `<ul class="list">${j.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>`).join("");
  }

  function renderTestimonials(data) {
    const section = $("#testimonials");
    const list = data.testimonials || [];
    if (data.settings && data.settings.showTestimonials === false) { section.remove(); return; }
    if (!list.length) { section.remove(); return; }

    const card = (t) => `
      <figure class="quote">
        <div class="quote__mark">"</div>
        <blockquote class="quote__text">${esc(t.quote)}</blockquote>
        <figcaption class="quote__who">
          <span class="quote__ava" style="background:${gradient(t.gradient)}">${esc(initialsOf(t.name))}</span>
          <span>
            <span class="quote__name">${esc(t.name)}</span><br>
            <span class="quote__role">${esc(t.role)}</span>
          </span>
        </figcaption>
      </figure>`;

    // duplicated once for a seamless loop
    $("#quotes").innerHTML = list.map(card).join("") + list.map(card).join("");
  }

  function renderSocials(data) {
    $("#socials").innerHTML = (data.socials || []).map((l) => `
      <a class="social" href="${esc(l.url)}" target="_blank" rel="noopener">
        ${iconFilled(l.icon || "globe", 16)} ${esc(l.label)}
      </a>`).join("");
  }

  /* ------------------------------------------------ interactions */
  function initInteractions(data) {
    // nav: shrink on scroll + progress bar
    const nav = $("#nav");
    const bar = $("#progressBar");
    const onScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // mobile menu
    const toggle = $("#navToggle");
    const links = $("#navLinks");
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // scrollspy
    const spy = $$("main section[id]");
    const navAnchors = $$("#navLinks a");
    const spyObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spy.forEach((s) => spyObs.observe(s));

    // reveal on scroll + skill bars
    const revealAll = () => {
      $$(".reveal").forEach((el) => el.classList.add("in"));
      $$(".skill__fill").forEach((fill) => { fill.style.width = `${fill.dataset.level}%`; });
    };

    if (!("IntersectionObserver" in window)) {
      revealAll();
    } else {
      const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          $$(".skill__fill", entry.target).forEach((fill) => {
            fill.style.width = `${fill.dataset.level}%`;
          });
          revealObs.unobserve(entry.target);
        });
      }, { threshold: 0.14 });
      $$(".reveal").forEach((el) => revealObs.observe(el));
    }

    // spotlight follows the cursor (desktop only)
    const spot = $("#spotlight");
    if (window.matchMedia("(pointer: fine)").matches) {
      document.body.classList.add("has-pointer");
      let x = window.innerWidth / 2, y = window.innerHeight / 2, cx = x, cy = y;
      window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
      const loop = () => {
        cx += (x - cx) * 0.09;
        cy += (y - cy) * 0.09;
        spot.style.transform = `translate(${cx}px, ${cy}px)`;
        requestAnimationFrame(loop);
      };
      loop();

      // card glow follows the cursor
      document.addEventListener("pointermove", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }, { passive: true });

      // subtle 3D tilt on project cards
      $$(".project").forEach((card) => {
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `translateY(-6px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
        });
        card.addEventListener("pointerleave", () => { card.style.transform = ""; });
      });
    }

    // typed role
    const role = (data.profile || {}).role || "";
    const target = $("#typedRole");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.textContent = role;
    } else {
      let i = 0;
      const type = () => {
        target.textContent = role.slice(0, i++);
        if (i <= role.length) setTimeout(type, 42);
      };
      setTimeout(type, 350);
    }

    // copy email
    const toast = $("#toast");
    let toastTimer;
    const showToast = (msg) => {
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
    };

    const email = (data.profile || {}).email || "";
    $("#copyEmailLabel").textContent = email ? "Copy email" : "Contact";
    $("#copyEmail").addEventListener("click", async () => {
      if (!email) return;
      try {
        await navigator.clipboard.writeText(email);
        showToast(`✓ ${email} copied to clipboard`);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  }

  /* ------------------------------------------------------ boot */
  async function boot() {
    const data = await loadData();
    const bootEl = $("#boot");

    if (!data) {
      bootEl.textContent = "";
      bootEl.className = "loading";
      const notice = document.createElement("div");
      notice.className = "notice";
      notice.innerHTML =
        "Couldn't find <b>db.json</b> next to this page. " +
        "Start the server with <b>start.bat</b> (or <b>node server.js</b>) and reload — " +
        "or, on GitHub Pages, make sure <b>db.json</b> is committed to the repository.";
      document.body.appendChild(notice);
      return;
    }

    bootEl.remove();

    applyTheme(data);
    renderChrome(data);
    renderStats(data);
    renderMarquee(data);
    renderProjects(data);
    renderServices(data);
    renderAbout(data);
    renderExperience(data);
    renderTestimonials(data);
    renderSocials(data);
    initInteractions(data);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
