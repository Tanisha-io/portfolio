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

  scroller.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (loopWidth <= 0) return;
      event.preventDefault();
      pause();
      offset += event.deltaY;
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

const sections = [
  { id: "top", label: "Intro" },
  { id: "about", label: "About me" },
  { id: "experience", label: "Experience" },
  { id: "highlights", label: "Highlights" },
  { id: "projects", label: "Projects" },
  { id: "connect", label: "Connect" },
].map((item) => ({
  ...item,
  el: document.getElementById(item.id),
})).filter((item) => item.el);

const pagerPrev = document.getElementById("pager-prev");
const pagerNext = document.getElementById("pager-next");
const pagerLabel = document.getElementById("pager-label");

const getSectionIndex = () => {
  const marker = window.scrollY + window.innerHeight * 0.28;
  let index = 0;
  sections.forEach((section, i) => {
    if (section.el.offsetTop <= marker) index = i;
  });
  return index;
};

const goToSection = (index) => {
  const target = sections[index];
  if (!target) return;
  target.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
};

let labelText = "";

const setPagerLabel = (text) => {
  if (!pagerLabel || text === labelText) return;
  labelText = text;
  pagerLabel.classList.add("is-swap");
  window.setTimeout(() => {
    pagerLabel.textContent = text;
    pagerLabel.classList.remove("is-swap");
  }, 160);
};

const updatePager = () => {
  if (!pagerPrev || !pagerNext || !pagerLabel || !sections.length) return;
  const index = getSectionIndex();
  const next = sections[Math.min(index + 1, sections.length - 1)];
  const atStart = index <= 0;
  const atEnd = index >= sections.length - 1;

  pagerPrev.disabled = atStart;
  pagerNext.disabled = false;
  setPagerLabel(atEnd ? "Top" : next.label);
  pagerNext.setAttribute("aria-label", atEnd ? "Back to top" : `Next: ${next.label}`);
  pagerPrev.setAttribute(
    "aria-label",
    atStart ? "Previous section" : `Previous: ${sections[Math.max(0, index - 1)].label}`
  );
};

const flashPagerBtn = (btn) => {
  if (!btn || reduceMotion) return;
  btn.classList.add("is-pressed");
  window.setTimeout(() => btn.classList.remove("is-pressed"), 220);
};

if (pagerPrev && pagerNext) {
  pagerPrev.addEventListener("click", () => {
    flashPagerBtn(pagerPrev);
    const index = getSectionIndex();
    goToSection(Math.max(0, index - 1));
  });

  pagerNext.addEventListener("click", () => {
    flashPagerBtn(pagerNext);
    const index = getSectionIndex();
    if (index >= sections.length - 1) {
      goToSection(0);
      return;
    }
    goToSection(index + 1);
  });

  updatePager();
  window.addEventListener("scroll", updatePager, { passive: true });
  window.addEventListener("resize", updatePager, { passive: true });
}
