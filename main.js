const toggle = document.getElementById("nav-toggle");
const nav = document.getElementById("site-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${Math.min(i % 3, 2) * 80}ms`);
      io.observe(el);
    });
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-hscroll]").forEach((scroller) => {
  if (reduceMotion) return;

  scroller.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (maxScroll <= 0) return;

      const atStart = scroller.scrollLeft <= 0;
      const atEnd = scroller.scrollLeft >= maxScroll - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;

      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    },
    { passive: false }
  );
});
