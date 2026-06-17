/* ============================================================
   Summit Studio — funnel interactions (vanilla JS, no deps)
   ============================================================ */
(function () {
  "use strict";

  /* ---- Scroll reveal via IntersectionObserver ---- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- Smooth-scroll for in-page anchors (with reduced-motion respect) ---- */
  function initSmoothScroll() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        // move focus for accessibility
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ---- Mobile sticky CTA: hide while the opt-in form is in view ---- */
  function initStickyCta() {
    var sticky = document.querySelector(".sticky-cta");
    var form = document.querySelector("#audit");
    if (!sticky || !form || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sticky.style.transform = entry.isIntersecting ? "translateY(120%)" : "translateY(0)";
      });
    }, { threshold: 0.25 });
    io.observe(form);
    sticky.style.transition = "transform 0.3s ease";
  }

  /* ---- Client-side validation + SMTP-backed submit ---- */
  function initForm() {
    var form = document.querySelector('form[data-funnel="optin"]');
    if (!form) return;
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector("[data-form-status]");
    var defaultText = btn ? btn.textContent : "";

    function setStatus(message, type) {
      if (!status) return;
      status.textContent = message || "";
      status.dataset.state = type || "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setStatus("", "");

      // honeypot: if filled, silently drop
      var hp = form.querySelector('input[name="bot-field"]');
      if (hp && hp.value) return;

      var ok = true;
      form.querySelectorAll("input[required]").forEach(function (input) {
        if (!input.checkValidity()) { ok = false; input.setAttribute("aria-invalid", "true"); }
        else { input.removeAttribute("aria-invalid"); }
      });
      if (!ok) {
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }

      if (btn) { btn.textContent = "Sending\u2026"; btn.disabled = true; }

      var payload = {};
      Array.prototype.forEach.call(new FormData(form).entries(), function (entry) {
        payload[entry[0]] = entry[1];
      });

      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.error || "Request failed (status " + res.status + ")");
            return data;
          });
        })
        .then(function () {
          form.reset();
          setStatus("Your audit request was sent. Watch your inbox within 24 hours.", "success");
        })
        .catch(function (err) {
          setStatus(err.message || "Something went wrong. Please try again.", "error");
        })
        .finally(function () {
          if (btn) { btn.textContent = defaultText; btn.disabled = false; }
        });
    });
  }

  /* ---- Footer year ---- */
  function initYear() {
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initSmoothScroll();
    initStickyCta();
    initForm();
    initYear();
  });
})();
