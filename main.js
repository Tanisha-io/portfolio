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

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length) {
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

document.querySelectorAll("[data-hscroll]").forEach((scroller) => {
  const track = scroller.querySelector(".h-track");
  if (!track) return;

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

  if (reduceMotion) return;

  const originals = Array.from(track.children);
  if (originals.length < 2) return;

  originals.forEach((child) => {
    const clone = child.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a, button, [tabindex]").forEach((el) => {
      el.setAttribute("tabindex", "-1");
      if (el.hasAttribute("href")) el.removeAttribute("href");
    });
    track.appendChild(clone);
  });

  let paused = false;
  let inView = false;
  let resumeTimer = 0;
  let loopWidth = 0;
  let raf = 0;
  const speed = 0.35;

  const measure = () => {
    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    loopWidth = originals.reduce((sum, child, index) => {
      return sum + child.getBoundingClientRect().width + (index < originals.length - 1 ? gap : 0);
    }, 0);
    // include the gap between the last original and first clone
    loopWidth += gap;
  };

  const pause = () => {
    paused = true;
    window.clearTimeout(resumeTimer);
  };

  const scheduleResume = () => {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      paused = false;
    }, 1600);
  };

  ["pointerenter", "focusin", "touchstart"].forEach((type) => {
    scroller.addEventListener(type, pause, { passive: true });
  });
  ["pointerleave", "focusout"].forEach((type) => {
    scroller.addEventListener(type, scheduleResume, { passive: true });
  });
  scroller.addEventListener(
    "wheel",
    () => {
      pause();
      scheduleResume();
    },
    { passive: true }
  );
  scroller.addEventListener(
    "pointerdown",
    () => {
      pause();
    },
    { passive: true }
  );
  window.addEventListener(
    "pointerup",
    () => {
      if (scroller.matches(":hover") || scroller.contains(document.activeElement)) return;
      scheduleResume();
    },
    { passive: true }
  );

  const tick = () => {
    if (inView && !paused && loopWidth > 0) {
      scroller.classList.add("is-autoplaying");
      scroller.scrollLeft += speed;
      if (scroller.scrollLeft >= loopWidth) {
        scroller.scrollLeft -= loopWidth;
      }
    } else {
      scroller.classList.remove("is-autoplaying");
    }
    raf = window.requestAnimationFrame(tick);
  };

  const viewIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting && entry.intersectionRatio > 0.35;
      });
    },
    { threshold: [0, 0.35, 0.7] }
  );
  viewIo.observe(scroller);

  measure();
  window.addEventListener("resize", measure, { passive: true });
  raf = window.requestAnimationFrame(tick);
});
