(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const THEME_KEY = "landing-theme";
  const root = document.documentElement;
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
  });

  const nav = document.getElementById("nav");
  const onNavScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  onNavScroll();
  document.addEventListener("scroll", onNavScroll, { passive: true });

  document.getElementById("scrollCue")?.addEventListener("click", () => {
    document.getElementById("how")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  const revealTargets = document.querySelectorAll(".reveal, .step");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax-speed]"));
  const heroVideo = document.getElementById("heroVideo");
  const hero = document.querySelector(".hero");
  const stepsList = document.getElementById("stepsList");
  const stepsFill = document.getElementById("stepsFill");

  // Видео целиком — это один длинный разворот медали (к 3-4-й секунде камера уже
  // смотрит почти сбоку). Вместо родного loop (прыжок в конец → начало, похоже на
  // рывок) берём только спокойный участок 0–2.6с и прокручиваем его туда-обратно —
  // медаль мягко покачивается влево-вправо, не долетая до резкого разворота.
  if (heroVideo) {
    heroVideo.removeAttribute("loop");
    heroVideo.pause();
    const SWAY_END = 2.6;
    const SWAY_PERIOD = 6000;
    const STEP_MS = 90;
    if (reduceMotion) {
      heroVideo.currentTime = 0;
    } else {
      let lastUpdate = 0;
      const tick = (now) => {
        if (now - lastUpdate >= STEP_MS) {
          lastUpdate = now;
          const phase = (now % SWAY_PERIOD) / SWAY_PERIOD;
          const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          heroVideo.currentTime = SWAY_END * triangle;
        }
        requestAnimationFrame(tick);
      };
      const start = () => requestAnimationFrame(tick);
      if (heroVideo.readyState >= 1) start();
      else heroVideo.addEventListener("loadedmetadata", start, { once: true });
    }
  }

  let ticking = false;
  function onFrame() {
    ticking = false;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;

    if (!reduceMotion) {
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        if (heroRect.bottom > 0 && heroRect.top < vh) {
          const progress = -heroRect.top;
          if (heroVideo) heroVideo.style.transform = `translateY(${progress * 0.18}px) scale(1.02)`;
          for (const el of parallaxEls) {
            const speed = Number(el.dataset.parallaxSpeed || 0);
            el.style.transform = `translateY(${progress * speed}px)`;
          }
        }
      }
    }

    if (stepsList && stepsFill) {
      const rect = stepsList.getBoundingClientRect();
      const total = rect.height - vh * 0.4;
      const passed = vh * 0.75 - rect.top;
      const pct = total > 0 ? Math.min(100, Math.max(0, (passed / total) * 100)) : 0;
      stepsFill.style.height = pct + "%";
    }
  }
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(onFrame);
      ticking = true;
    }
  }
  document.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  onFrame();

  if (!reduceMotion && hero && window.matchMedia("(pointer: fine)").matches) {
    const floats = document.querySelectorAll(".float-card");
    hero.addEventListener("pointermove", (e) => {
      const { innerWidth, innerHeight } = window;
      const dx = (e.clientX / innerWidth - 0.5) * 2;
      const dy = (e.clientY / innerHeight - 0.5) * 2;
      floats.forEach((card, i) => {
        const amp = 8 + i * 4;
        card.style.setProperty("--tiltX", `${dx * amp}px`);
        card.style.setProperty("--tiltY", `${dy * amp}px`);
        const speed = Number(card.dataset.parallaxSpeed || 0);
        const scrollShift = -hero.getBoundingClientRect().top * speed;
        card.style.transform = `translate(${dx * amp}px, ${scrollShift + dy * amp}px)`;
      });
    });
  }
})();
