// Static prayer-time payload (JSON-style object for fast client rendering).
const prayerTimes = {
  date: "2026-03-31",
  city: "الحي المحلي",
  times: [
    { name: "الفجر", time: "5:10 ص" },
    { name: "الظهر", time: "12:35 م" },
    { name: "العصر", time: "4:05 م" },
    { name: "المغرب", time: "6:41 م" },
    { name: "العشاء", time: "8:03 م" }
  ]
};

const yearEl = document.getElementById("year");
const prayerGrid = document.getElementById("prayer-grid");
const lazySections = document.querySelectorAll(".lazy-section");
const sceneRootMargin = "280px 0px";
const modelPath = "./models/Masjid1Tower.glb";
const texturePath = "./models/Masjid1Tower1.jpg";

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function renderPrayerTimes() {
  if (!prayerGrid) {
    return;
  }

  prayerGrid.innerHTML = "";

  prayerTimes.times.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "card prayer-card hover-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `صلاة ${entry.name} عند الساعة ${entry.time}`);

    const name = document.createElement("span");
    name.className = "prayer-name";
    name.textContent = entry.name;

    const time = document.createElement("span");
    time.className = "prayer-time";
    time.textContent = entry.time;

    card.append(name, time);
    prayerGrid.appendChild(card);
  });
}

// Lightweight reveal animation for non-critical sections.
function setupSectionReveal() {
  if (!("IntersectionObserver" in window)) {
    lazySections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px"
    }
  );

  lazySections.forEach((section) => revealObserver.observe(section));
}

// Lazy-load the Three.js module only when the 3D section approaches viewport.
function setup3DLazyLoad() {
  const section = document.getElementById("explore");
  if (!section) {
    return;
  }

  let sceneLoaded = false;

  const startScene = async () => {
    if (sceneLoaded) {
      return;
    }

    sceneLoaded = true;

    try {
      const module = await import("./threeScene.js");
      module.initMosqueScene({
        containerId: "scene-wrap",
        canvasId: "mosque-canvas",
        loaderId: "scene-loader",
        statusId: "scene-status",
        modelPath,
        texturePath
      });
    } catch (error) {
      const container = document.getElementById("scene-wrap");
      const loader = document.getElementById("scene-loader");
      const status = document.getElementById("scene-status");
      if (status) {
        status.textContent = "تعذر تحميل مكونات العرض ثلاثي الأبعاد. تحقق من الإنترنت ثم حدّث الصفحة.";
      }
      if (container) {
        container.classList.add("is-ready");
        container.setAttribute("aria-busy", "false");
      }
      if (loader) {
        loader.setAttribute("aria-hidden", "false");
      }
      console.error("3D scene initialization failed:", error);
    }
  };

  if (!("IntersectionObserver" in window)) {
    startScene();
    return;
  }

  const sceneObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startScene();
          observer.disconnect();
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: sceneRootMargin
    }
  );

  sceneObserver.observe(section);
}

// Boot sequence.
renderPrayerTimes();
setupSectionReveal();
setup3DLazyLoad();
