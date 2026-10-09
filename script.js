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
  const heroCanvas = document.getElementById("heroCanvas");
  const heroMedia = document.querySelector(".hero-media");
  const heroVisuals = [heroVideo, heroCanvas].filter(Boolean);
  const hero = document.querySelector(".hero");
  const stepsList = document.getElementById("stepsList");
  const stepsFill = document.getElementById("stepsFill");

  let ticking = false;
  function onFrame() {
    ticking = false;
    const vh = window.innerHeight;

    if (!reduceMotion && hero) {
      const heroRect = hero.getBoundingClientRect();
      if (heroRect.bottom > 0 && heroRect.top < vh) {
        const progress = -heroRect.top;
        const heroTransform = `translateY(${progress * 0.18}px) scale(1.02)`;
        heroVisuals.forEach((el) => (el.style.transform = heroTransform));
        for (const el of parallaxEls) {
          const speed = Number(el.dataset.parallaxSpeed || 0);
          el.style.transform = `translateY(${progress * speed}px)`;
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

  // Качание медали. Ролик — один долгий разворот, поэтому берём спокойный участок 0–2.6с.
  // Кадры декодируются один раз при загрузке (requestVideoFrameCallback отдаёт ровно те кадры,
  // что видит пользователь), дальше канва переключает их по времени: вперёд, потом назад.
  // Перемотки самого видео назад на каждом кадре и давали рывки — их здесь больше нет.
  const SWAY_END = 2.6;
  const FRAME_SIZE = 720;
  const canSway =
    !reduceMotion &&
    heroVideo &&
    heroCanvas &&
    heroMedia &&
    hero &&
    "requestVideoFrameCallback" in HTMLVideoElement.prototype &&
    "createImageBitmap" in window;

  if (heroVideo) heroVideo.pause();

  if (canSway) {
    let visible = true;
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(hero);

    const ctx = heroCanvas.getContext("2d");
    heroCanvas.width = FRAME_SIZE;
    heroCanvas.height = FRAME_SIZE;

    const jobs = [];
    let capturing = true;

    const startLoop = (frames) => {
      const bitmaps = frames.map((f) => f.bitmap);
      const n = bitmaps.length;
      const span = frames[n - 1].t - frames[0].t;
      const fps = span > 0 ? (n - 1) / span : 24;
      const cycle = 2 * n - 2;
      const frameAt = (k) => {
        const pos = k % cycle;
        return bitmaps[pos < n ? pos : cycle - pos];
      };

      ctx.drawImage(bitmaps[n - 1], 0, 0);
      heroMedia.classList.add("is-canvas");

      const t0 = performance.now() - ((n - 1) / fps) * 1000;
      let lastK = -1;
      const draw = (now) => {
        if (visible) {
          const k = Math.floor(((now - t0) / 1000) * fps);
          if (k !== lastK) {
            lastK = k;
            ctx.drawImage(frameAt(k), 0, 0);
          }
        }
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    };

    const finishCapture = () => {
      if (!capturing) return;
      capturing = false;
      heroVideo.pause();
      Promise.all(jobs).then((list) => {
        const frames = list.filter(Boolean).sort((a, b) => a.t - b.t);
        if (frames.length > 1) startLoop(frames);
      });
    };

    const onVideoFrame = (now, meta) => {
      if (!capturing) return;
      if (meta.mediaTime > SWAY_END) {
        finishCapture();
        return;
      }
      jobs.push(
        createImageBitmap(heroVideo, { resizeWidth: FRAME_SIZE, resizeHeight: FRAME_SIZE })
          .then((bitmap) => ({ t: meta.mediaTime, bitmap }))
          .catch(() => null)
      );
      heroVideo.requestVideoFrameCallback(onVideoFrame);
    };

    const begin = () => {
      heroVideo.currentTime = 0;
      heroVideo.requestVideoFrameCallback(onVideoFrame);
      heroVideo.play().catch(() => {
        capturing = false;
      });
    };

    heroVideo.addEventListener("ended", finishCapture);
    if (heroVideo.readyState >= 2) begin();
    else heroVideo.addEventListener("loadeddata", begin, { once: true });
  }

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
