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

  /* ---- Footer year ---- */
  function initYear() {
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initSmoothScroll();
    initStickyCta();
    initYear();
  });
})();
