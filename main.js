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

const aboutScreen = document.getElementById("about");
if (aboutScreen) {
  if (reduceMotion) {
    aboutScreen.classList.add("is-inview");
  } else {
    const aboutIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          aboutScreen.classList.add("is-inview");
          aboutIo.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );
    aboutIo.observe(aboutScreen);
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

const sectionIds = ["top", "about", "experience", "highlights", "projects", "connect"];
const sectionLabels = {
  top: "Intro",
  about: "About me",
  experience: "Experience",
  highlights: "Highlights",
  projects: "Projects",
  connect: "Connect",
};
const sections = sectionIds
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const prevBtn = document.getElementById("section-prev");
const nextBtn = document.getElementById("section-next");
const sectionLabel = document.getElementById("section-nav-label");
let activeSection = 0;

const getSectionIndex = () => {
  const marker = window.scrollY + window.innerHeight * 0.35;
  let index = 0;
  sections.forEach((section, i) => {
    if (section.offsetTop <= marker) index = i;
  });
  return index;
};

const updateSectionNav = () => {
  activeSection = getSectionIndex();
  const nextIndex = Math.min(activeSection + 1, sections.length - 1);
  const atEnd = activeSection >= sections.length - 1;
  const kicker = document.querySelector(".section-nav-kicker");
  if (sectionLabel) {
    sectionLabel.textContent = atEnd
      ? "Intro"
      : sectionLabels[sections[nextIndex].id] || "Next";
  }
  if (kicker) kicker.textContent = atEnd ? "Back" : "Next";
  if (prevBtn) prevBtn.disabled = activeSection <= 0;
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.setAttribute(
      "aria-label",
      atEnd ? "Back to top" : "Next section"
    );
  }
};

const goToSection = (index) => {
  const target = sections[index];
  if (!target) return;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
};

if (prevBtn && nextBtn && sections.length) {
  prevBtn.addEventListener("click", () => {
    goToSection(Math.max(getSectionIndex() - 1, 0));
  });
  nextBtn.addEventListener("click", () => {
    const current = getSectionIndex();
    if (current >= sections.length - 1) {
      goToSection(0);
      return;
    }
    goToSection(current + 1);
  });
  updateSectionNav();
  window.addEventListener("scroll", updateSectionNav, { passive: true });
  window.addEventListener("resize", updateSectionNav, { passive: true });
}

const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const againBtn = document.getElementById("contact-again");
  contactForm.addEventListener("submit", () => {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    window.setTimeout(() => {
      contactForm.classList.add("is-sent");
      contactForm.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send";
      }
    }, 600);
  });
  if (againBtn) {
    againBtn.addEventListener("click", () => {
      contactForm.classList.remove("is-sent");
      contactForm.reset();
      const firstField = contactForm.querySelector("input, textarea");
      if (firstField) firstField.focus();
    });
  }
}
