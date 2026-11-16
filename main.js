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
  let offset = 0;
  const speed = 0.85;

  const measure = () => {
    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    loopWidth = originals.reduce((sum, child, index) => {
      return sum + child.getBoundingClientRect().width + (index < originals.length - 1 ? gap : 0);
    }, 0);
    loopWidth += gap;
    if (loopWidth > 0) {
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }
  };

  const wrapOffset = () => {
    if (loopWidth <= 0) return;
    offset = ((offset % loopWidth) + loopWidth) % loopWidth;
  };

  const pause = () => {
    paused = true;
    window.clearTimeout(resumeTimer);
  };

  const scheduleResume = () => {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      paused = false;
    }, 1200);
  };

  ["pointerenter", "focusin", "touchstart"].forEach((type) => {
    scroller.addEventListener(type, pause, { passive: true });
  });
  ["pointerleave", "focusout"].forEach((type) => {
    scroller.addEventListener(type, scheduleResume, { passive: true });
  });
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

  // Keep vertical page scroll free. Only nudge the gallery on clear horizontal intent.
  scroller.addEventListener(
    "wheel",
    (event) => {
      if (loopWidth <= 0) return;
      if (Math.abs(event.deltaX) < 1 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      pause();
      offset += event.deltaX;
      wrapOffset();
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      scheduleResume();
    },
    { passive: false }
  );

  const tick = () => {
    if (inView && !paused && loopWidth > 0) {
      scroller.classList.add("is-autoplaying");
      offset += speed;
      wrapOffset();
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    } else {
      scroller.classList.remove("is-autoplaying");
    }
    window.requestAnimationFrame(tick);
  };

  const viewIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting;
      });
    },
    { threshold: 0.12 }
  );
  viewIo.observe(scroller);

  // Wait a frame so reveal/layout widths are real before measuring.
  window.requestAnimationFrame(() => {
    measure();
    window.requestAnimationFrame(tick);
  });
  window.addEventListener("resize", measure, { passive: true });
});
