(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------
     MOUNTS — idempotent, fill from data only if HTML is empty
  --------------------------------------------------------- */

  function mountMaterials() {
    var track = $("[data-marquee-track]");
    if (!track || track.children.length > 0 || !data.materials) return;
    var html = data.materials.map(function (m) {
      return '<span class="marquee-item">' + escHTML(m) + '</span><span class="marquee-dot" aria-hidden="true">&#9670;</span>';
    }).join("");
    track.innerHTML = html;
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.parentNode.appendChild(clone);
  }

  function mountStats() {
    var target = $("[data-stats]");
    if (!target || target.children.length > 0 || !data.stats) return;
    target.innerHTML = data.stats.map(function (s) {
      return '' +
        '<div class="stat" data-reveal>' +
          '<span class="stat-num"><span data-count-to="' + s.value + '">0</span>' + escHTML(s.suffix || "") + '</span>' +
          '<span class="stat-label">' + escHTML(s.label) + '</span>' +
        '</div>';
    }).join("");
  }

  function mountAdvantages() {
    var target = $("[data-advantages]");
    if (!target || target.children.length > 0 || !data.advantages) return;
    target.innerHTML = data.advantages.map(function (a, i) {
      var big = i === 0 ? " adv-card--big" : "";
      return '' +
        '<article class="adv-card' + big + ' has-sheen" data-reveal data-tilt>' +
          '<span class="adv-num">' + escHTML(a.num) + '</span>' +
          '<h3 class="adv-title">' + escHTML(a.title) + '</h3>' +
          '<p class="adv-text">' + escHTML(a.text) + '</p>' +
        '</article>';
    }).join("");
  }

  function mountApplications() {
    var target = $("[data-applications]");
    if (!target || target.children.length > 0 || !data.applications) return;
    target.innerHTML = data.applications.map(function (a, i) {
      var shape = ["ph--wide", "ph--tall", "ph--square", "ph--tall", "ph--wide"][i % 5];
      return '' +
        '<figure class="app-card" data-reveal>' +
          '<div class="ph-image ' + shape + '" aria-hidden="true">' +
            '<span class="ph-frame"></span>' +
            '<span class="ph-label">Photo — ' + escHTML(a.title) + '</span>' +
          '</div>' +
          '<figcaption>' +
            '<h3>' + escHTML(a.title) + '</h3>' +
            '<p>' + escHTML(a.text) + '</p>' +
          '</figcaption>' +
        '</figure>';
    }).join("");
  }

  function mountTestimonials() {
    var target = $("[data-testimonials]");
    if (!target || target.children.length > 0 || !data.testimonials) return;
    target.innerHTML = data.testimonials.map(function (t) {
      return '' +
        '<article class="quote-card has-sheen" data-reveal data-tilt>' +
          '<p class="quote-mark" aria-hidden="true">&#8220;</p>' +
          '<blockquote>' + escHTML(t.quote) + '</blockquote>' +
          '<footer>' +
            '<span class="quote-name">' + escHTML(t.name) + '</span>' +
            '<span class="quote-role">' + escHTML(t.role) + '</span>' +
          '</footer>' +
        '</article>';
    }).join("");
  }

  function mountContactInfo() {
    var c = data.contact;
    if (!c) return;
    var phoneEl = $("[data-contact-phone]");
    if (phoneEl && !phoneEl.dataset.mounted) {
      phoneEl.textContent = c.founder + ": " + c.phone;
      phoneEl.href = "tel:" + c.phoneHref;
      phoneEl.dataset.mounted = "1";
    }
    $$("[data-contact-phone-plain]").forEach(function (el) {
      if (el.dataset.mounted) return;
      el.textContent = c.phone;
      el.dataset.mounted = "1";
    });
    $$("[data-contact-email]").forEach(function (el) {
      if (el.dataset.mounted) return;
      el.textContent = c.email;
      el.href = "mailto:" + c.email;
      el.dataset.mounted = "1";
    });
    $$("[data-contact-address]").forEach(function (el) {
      if (el.dataset.mounted) return;
      el.textContent = c.address;
      el.dataset.mounted = "1";
    });
    $$("[data-contact-hours]").forEach(function (el) {
      if (el.dataset.mounted) return;
      el.textContent = c.hours;
      el.dataset.mounted = "1";
    });
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------------------------------------------------------
     INITS
  --------------------------------------------------------- */

  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 60) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var burger = $("[data-burger]");
    var mobileNav = $("[data-mobile-nav]");
    if (burger && mobileNav) {
      burger.addEventListener("click", function () {
        var open = mobileNav.getAttribute("aria-hidden") === "false";
        mobileNav.setAttribute("aria-hidden", open ? "true" : "false");
        burger.setAttribute("aria-expanded", open ? "false" : "true");
        document.documentElement.classList.toggle("nav-open", !open);
      });
      $$("[data-mobile-nav] a").forEach(function (a) {
        a.addEventListener("click", function () {
          mobileNav.setAttribute("aria-hidden", "true");
          burger.setAttribute("aria-expanded", "false");
          document.documentElement.classList.remove("nav-open");
        });
      });
    }
  }

  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  function initCountUp() {
    $$("[data-count-to]").forEach(function (el) {
      var target = parseFloat(el.dataset.countTo);
      if (isNaN(target)) return;
      var trigger = function () {
        if (reduced) { el.textContent = target; return; }
        var start = null;
        var duration = 1400;
        function tick(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / duration);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(eased * target);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        }
        requestAnimationFrame(tick);
      };
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { trigger(); io.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  function initTiltAndSheen() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(function (card) {
      var MAX = 6;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        tx = -(py - 0.5) * MAX;
        ty = (px - 0.5) * MAX;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.15;
        cy += (ty - cy) * 0.15;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.dataset.magneticStrength || "0.25");
      var inner = document.createElement("span");
      inner.className = "magnetic-inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add("has-magnetic");
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) - r.width / 2) * strength;
        ty = ((e.clientY - r.top) - r.height / 2) * strength;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.2;
        cy += (ty - cy) * 0.2;
        inner.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
        raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  function initHeroParallax() {
    if (reduced) return;
    var bg = $("[data-hero-veins]");
    var hero = $(".hero");
    if (!bg || !hero) return;
    var raf = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var rect = hero.getBoundingClientRect();
        var progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
        bg.style.transform = "translate3d(0," + (progress * 12) + "%,0) scale(" + (1.06 + progress * 0.08) + ")";
        raf = null;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function setupContactForm() {
    var form = $("[data-contact-form]");
    var success = $("[data-contact-success]");
    if (!form || !success) return;
    var submitBtn = form.querySelector("[type=submit]");
    var msg = $("[data-contact-success-msg]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      if (!form.reportValidity()) return;

      form.classList.add("is-sending");
      submitBtn.disabled = true;

      setTimeout(function () {
        var nameField = form.elements.name;
        var firstName = nameField && nameField.value.trim() ? nameField.value.trim().split(/\s+/)[0] : "there";
        if (msg) msg.textContent = firstName + ", we've received your request. " + (data.contact ? data.contact.founder : "Our team") + " will follow up within one business day.";
        form.classList.remove("is-sending");
        form.classList.add("is-sent");
        success.setAttribute("aria-hidden", "false");
        success.classList.add("is-visible");
      }, 900 + Math.random() * 500);
    });
  }

  function boot() {
    safe(mountMaterials, "mountMaterials");
    safe(mountStats, "mountStats");
    safe(mountAdvantages, "mountAdvantages");
    safe(mountApplications, "mountApplications");
    safe(mountTestimonials, "mountTestimonials");
    safe(mountContactInfo, "mountContactInfo");

    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initTiltAndSheen, "initTiltAndSheen");
    safe(initMagnetic, "initMagnetic");
    safe(initHeroParallax, "initHeroParallax");
    safe(setupContactForm, "setupContactForm");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
