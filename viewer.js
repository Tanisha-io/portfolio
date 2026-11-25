(function () {
  const PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.hidden = true;
  viewer.innerHTML =
    '<div class="viewer-backdrop" data-close></div>' +
    '<div class="viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="viewer-title">' +
    '<header class="viewer-bar">' +
    '<h2 id="viewer-title">Document</h2>' +
    '<button type="button" class="viewer-close" data-close>Close</button>' +
    "</header>" +
    '<div class="viewer-pages" id="viewer-pages"></div>' +
    "</div>";
  document.body.appendChild(viewer);

  const pages = viewer.querySelector("#viewer-pages");
  const title = viewer.querySelector("#viewer-title");
  const closeButton = viewer.querySelector(".viewer-close");
  let lastFocus = null;
  let session = 0;
  let currentPdf = null;
  let pageObserver = null;
  let pdfjsPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return Promise.resolve(window.pdfjsLib);
    }
    if (!pdfjsPromise) {
      pdfjsPromise = new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = PDFJS_SRC;
        script.async = true;
        script.onload = function () {
          if (!window.pdfjsLib) {
            pdfjsPromise = null;
            reject(new Error("PDF viewer failed to load"));
            return;
          }
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          resolve(window.pdfjsLib);
        };
        script.onerror = function () {
          pdfjsPromise = null;
          reject(new Error("PDF viewer failed to load"));
        };
        document.head.appendChild(script);
      });
    }
    return pdfjsPromise;
  }

  function resetDocument() {
    if (pageObserver) {
      pageObserver.disconnect();
      pageObserver = null;
    }
    if (currentPdf) {
      currentPdf.destroy().catch(function () {});
      currentPdf = null;
    }
    pages.replaceChildren();
  }

  function showStatus(message) {
    pages.replaceChildren();
    const status = document.createElement("p");
    status.className = "viewer-status";
    status.textContent = message;
    pages.appendChild(status);
  }

  function resolveAnnotationUrl(ann) {
    if (!ann) return "";
    if (ann.url) return ann.url;
    if (ann.unsafeUrl) return ann.unsafeUrl;
    if (ann.action && typeof ann.action === "string" && /^(https?:\/\/|mailto:)/i.test(ann.action)) {
      return ann.action;
    }
    return "";
  }

  function normalizeHref(raw) {
    if (!raw) return "";
    const cleaned = String(raw).replace(/[),.;]+$/g, "").trim();
    if (/^mailto:/i.test(cleaned) || /^https?:\/\//i.test(cleaned)) return cleaned;
    if (/^www\./i.test(cleaned)) return "https://" + cleaned;
    return "";
  }

  function appendLink(layer, href, left, top, width, height) {
    const safeHref = normalizeHref(href);
    if (!safeHref || width < 1 || height < 1) return;
    const link = document.createElement("a");
    link.className = "viewer-link";
    link.href = safeHref;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = safeHref;
    link.setAttribute("aria-label", safeHref);
    link.style.left = left + "px";
    link.style.top = top + "px";
    link.style.width = width + "px";
    link.style.height = height + "px";
    layer.appendChild(link);
  }

  function addAnnotationLinks(page, layer, cssViewport) {
    return page.getAnnotations({ intent: "display" }).then(function (annotations) {
      annotations.forEach(function (ann) {
        if (!ann || ann.subtype !== "Link") return;
        const href = resolveAnnotationUrl(ann);
        if (!href) return;
        const rect = cssViewport.convertToViewportRectangle(ann.rect);
        appendLink(
          layer,
          href,
          Math.min(rect[0], rect[2]),
          Math.min(rect[1], rect[3]),
          Math.abs(rect[0] - rect[2]),
          Math.abs(rect[1] - rect[3])
        );
      });
    });
  }

  function addTextLinks(page, layer, cssViewport) {
    return page.getTextContent().then(function (textContent) {
      const util = window.pdfjsLib && window.pdfjsLib.Util;
      if (!util) return;
      textContent.items.forEach(function (item) {
        if (!item || !item.str) return;
        const match = String(item.str).match(/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|mailto:[^\s<>"']+)/i);
        if (!match) return;
        const transform = util.transform(cssViewport.transform, item.transform);
        const fontHeight = Math.hypot(transform[2], transform[3]) || 10;
        const width = typeof item.width === "number" ? item.width * cssViewport.scale : match[0].length * fontHeight * 0.5;
        appendLink(
          layer,
          match[0],
          transform[4],
          transform[5] - fontHeight,
          Math.max(width, fontHeight * 2),
          Math.max(fontHeight * 1.2, 10)
        );
      });
    });
  }

  function addLinkLayer(page, holder, cssViewport, token) {
    const layer = document.createElement("div");
    layer.className = "viewer-links";
    return Promise.all([
      addAnnotationLinks(page, layer, cssViewport),
      addTextLinks(page, layer, cssViewport)
    ]).then(function () {
      if (token !== session) return;
      if (layer.childNodes.length) holder.appendChild(layer);
    });
  }

  function paintPage(pdf, pageNumber, holder, token) {
    return pdf.getPage(pageNumber).then(function (page) {
      if (token !== session) return;
      const unscaled = page.getViewport({ scale: 1 });
      const cssWidth = Math.max(holder.clientWidth || 0, 280);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const cssScale = cssWidth / unscaled.width;
      const cssViewport = page.getViewport({ scale: cssScale });
      const viewport = page.getViewport({ scale: cssScale * pixelRatio });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      holder.style.aspectRatio = unscaled.width + " / " + unscaled.height;
      holder.replaceChildren(canvas);
      return page
        .render({
          canvasContext: canvas.getContext("2d"),
          viewport: viewport
        })
        .promise.then(function () {
          return addLinkLayer(page, holder, cssViewport, token);
        });
    });
  }

  function pageWidth() {
    return Math.min(Math.max(pages.clientWidth - 24, 280), 820);
  }

  function showDocument(pdf, token) {
    pages.replaceChildren();
    const width = pageWidth();
    pageObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || token !== session) return;
          const holder = entry.target;
          if (holder.dataset.rendered === "1") return;
          holder.dataset.rendered = "1";
          pageObserver.unobserve(holder);
          paintPage(pdf, Number(holder.dataset.page), holder, token).catch(function () {
            if (token !== session) return;
            holder.textContent = "This page could not be shown.";
          });
        });
      },
      { root: pages, rootMargin: "800px 0px" }
    );

    return pdf.getPage(1).then(function (firstPage) {
      if (token !== session) return;
      const base = firstPage.getViewport({ scale: 1 });
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const holder = document.createElement("div");
        holder.className = "viewer-page";
        holder.dataset.page = String(i);
        holder.style.width = width + "px";
        holder.style.aspectRatio = base.width + " / " + base.height;
        pages.appendChild(holder);
        pageObserver.observe(holder);
      }
    });
  }

  function openViewer(fileUrl, label) {
    const token = ++session;
    lastFocus = document.activeElement;
    title.textContent = label || "Document";
    resetDocument();
    showStatus("Loading…");
    viewer.hidden = false;
    document.body.style.overflow = "hidden";
    closeButton.focus();

    loadPdfJs()
      .then(function (pdfjs) {
        if (token !== session) return null;
        return pdfjs.getDocument({ url: fileUrl, withCredentials: false }).promise;
      })
      .then(function (pdf) {
        if (!pdf || token !== session) {
          if (pdf) pdf.destroy().catch(function () {});
          return;
        }
        currentPdf = pdf;
        return showDocument(pdf, token);
      })
      .catch(function () {
        if (token !== session) return;
        showStatus("This document could not be opened.");
      });
  }

  function closeViewer() {
    if (viewer.hidden) return;
    session += 1;
    viewer.hidden = true;
    resetDocument();
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[data-pdf]");
    if (link) {
      event.preventDefault();
      const card = link.closest(".project-card, article");
      const heading = card && card.querySelector("h3");
      const fileUrl = new URL(link.getAttribute("data-pdf"), window.location.href).href;
      openViewer(fileUrl, heading ? heading.textContent.trim() : "Document");
      return;
    }
    if (event.target.closest("[data-close]")) closeViewer();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeViewer();
  });

  pages.addEventListener("contextmenu", function (event) {
    if (event.target.closest("a.viewer-link")) return;
    event.preventDefault();
  });
})();
