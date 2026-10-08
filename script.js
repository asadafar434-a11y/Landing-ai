(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
          if (heroVideo) heroVideo.style.transform = `translateY(${progress * 0.18}px) scale(1.08)`;
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
