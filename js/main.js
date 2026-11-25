/* Brasa Burger · interações · Estúdio Forja */
(function () {
  'use strict';

  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var celular = window.matchMedia('(max-width: 767px)');
  var temGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var EASE = 'expo.out';
  if (!temGsap || reduz) document.documentElement.classList.add('sem-anim');

  function depoisDoLoad(fn) {
    var go = function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1500 });
      else setTimeout(fn, 300);
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  function tocar(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function carregaFontes(v, webm, mp4) {
    var a = document.createElement('source'); a.src = webm; a.type = 'video/webm';
    var b = document.createElement('source'); b.src = mp4; b.type = 'video/mp4';
    v.appendChild(a); v.appendChild(b); v.preload = 'auto'; v.load();
    v.addEventListener('playing', function () { v.classList.add('tocando'); }, { once: true });
    tocar(v);
  }
  // vídeos só tocam quando aparecem na tela
  var observaVideo = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (!v.dataset.carregado) return;
      if (e.isIntersecting) tocar(v); else v.pause();
    });
  }, { threshold: 0.1 }) : null;

  /* ---------- rolagem suave ---------- */
  var lenis = null;
  if (!reduz && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    if (temGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  document.querySelectorAll('a[href^="#"]:not([data-pedido])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var alvo = document.querySelector(a.getAttribute('href'));
      if (!alvo) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(alvo, { offset: -70 }); else alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' });
    });
  });

  /* ---------- vídeo do hero (versão do celular ou do desktop) ---------- */
  var heroVideo = document.querySelector('.hero__video');
  if (heroVideo && !reduz) {
    depoisDoLoad(function () {
      var d = heroVideo.dataset, mob = celular.matches;
      heroVideo.dataset.carregado = '1';
      carregaFontes(heroVideo, mob ? d.mobWebm : d.deskWebm, mob ? d.mobMp4 : d.deskMp4);
      if (observaVideo) observaVideo.observe(heroVideo);
    });
  }

  /* ---------- vídeo da casa: só baixa quando chega perto ---------- */
  var casaVideo = document.querySelector('.casa__video');
  if (casaVideo && !reduz && 'IntersectionObserver' in window) {
    var obsCasa = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      obsCasa.disconnect();
      casaVideo.dataset.carregado = '1';
      carregaFontes(casaVideo, casaVideo.dataset.webm, casaVideo.dataset.mp4);
      if (observaVideo) observaVideo.observe(casaVideo);
    }, { rootMargin: '400px 0px' });
    obsCasa.observe(casaVideo);
  }

  /* ---------- topo e barra de pedido ---------- */
  var topo = document.querySelector('[data-topo]');
  var barra = document.querySelector('[data-barra]');
  var hero = document.querySelector('.hero');
  function aoRolar() {
    var y = window.scrollY;
    topo.classList.toggle('rolou', y > 40);
    if (barra && hero) barra.classList.toggle('visivel', y > hero.offsetHeight * 0.75);
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* ---------- ANATOMIA: o burger abre e fecha com a rolagem ----------
     Quadros extraídos do vídeo (midia/quadros/f001..f071.webp) desenhados num canvas.
     0–45%: abre · 45–75%: aberto (etiquetas + brilho de brasa) · 75–100%: fecha. */
  var anat = document.querySelector('.anatomia');
  var canvas = document.querySelector('[data-canvas]');
  var etiquetas = document.querySelector('[data-etiquetas]');
  var brilho = document.querySelector('[data-brilho]');
  var dica = document.querySelector('[data-dica]');
  var TOTAL = 71;
  var quadros = [];
  var alvoQuadro = 0, quadroAtual = -1, quadroSuave = 0;

  function caminho(i) { return 'midia/quadros/f' + String(i + 1).padStart(3, '0') + '.webp'; }
  function carregaQuadros() {
    if (quadros.length) return;
    for (var i = 0; i < TOTAL; i++) {
      var img = new Image();
      img.decoding = 'async';
      img.src = caminho(i);
      quadros.push(img);
    }
    // o primeiro quadro aparece assim que chegar
    quadros[0].onload = function () { desenha(0, true); };
  }
  function ajustaCanvas() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    quadroAtual = -1;
    desenha(Math.round(quadroSuave), true);
  }
  function desenha(i, forca) {
    if (!canvas) return;
    // usa o quadro carregado mais próximo, para nunca piscar em branco
    var img = quadros[i];
    if (!img || !img.complete || !img.naturalWidth) {
      for (var k = 1; k < TOTAL; k++) {
        var a = quadros[i - k], b = quadros[i + k];
        if (a && a.complete && a.naturalWidth) { img = a; break; }
        if (b && b.complete && b.naturalWidth) { img = b; break; }
      }
    }
    if (!img || !img.naturalWidth) return;
    if (i === quadroAtual && !forca) return;
    quadroAtual = i;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  function progressoAnatomia(p) {
    var ultimo = TOTAL - 1, f;
    if (p < 0.45) f = (p / 0.45) * ultimo;
    else if (p < 0.75) f = ultimo;
    else f = (1 - (p - 0.75) / 0.25) * ultimo;
    alvoQuadro = Math.max(0, Math.min(ultimo, f));
    if (dica) dica.style.opacity = p > 0.04 ? 0 : 1;
    if (brilho) {
      // pulso de brasa no auge da abertura
      var b = p < 0.3 ? 0 : p < 0.45 ? (p - 0.3) / 0.15 : p < 0.75 ? 1 : Math.max(0, 1 - (p - 0.75) / 0.12);
      brilho.style.opacity = (b * 0.95).toFixed(3);
      brilho.style.transform = 'translate(-50%, -50%) scale(' + (0.7 + b * 0.45).toFixed(3) + ')';
    }
  }
  var rodando = false, abertas = false;
  function loopAnatomia() {
    if (!rodando) return;
    // suaviza: o quadro "persegue" o alvo, sem saltos
    quadroSuave += (alvoQuadro - quadroSuave) * 0.18;
    if (Math.abs(alvoQuadro - quadroSuave) < 0.01) quadroSuave = alvoQuadro;
    desenha(Math.round(quadroSuave));
    // etiquetas só aparecem quando o burger DESENHADO está mesmo aberto (nunca antes da imagem chegar)
    var abrir = quadroAtual >= TOTAL - 4 && alvoQuadro >= TOTAL - 4;
    if (etiquetas && abrir !== abertas) { abertas = abrir; etiquetas.classList.toggle('visiveis', abrir); }
    requestAnimationFrame(loopAnatomia);
  }
  if (anat && canvas && !reduz) {
    if ('IntersectionObserver' in window) {
      // 1) as 71 imagens só baixam depois que a página carregou E quando a pessoa chega perto da cena
      depoisDoLoad(function () {
        var obsPerto = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { carregaQuadros(); obsPerto.disconnect(); }
        }, { rootMargin: '100% 0px' });
        obsPerto.observe(anat);
      });
      // 2) a animação só roda enquanto a cena está na tela
      new IntersectionObserver(function (es) {
        var visivel = es[0].isIntersecting;
        if (visivel && !rodando) { rodando = true; carregaQuadros(); ajustaCanvas(); requestAnimationFrame(loopAnatomia); }
        if (!visivel) rodando = false;
      }).observe(anat);
    } else { carregaQuadros(); rodando = true; ajustaCanvas(); loopAnatomia(); }
    window.addEventListener('resize', ajustaCanvas);
  }

  /* ---------- carimbos da fronteira ---------- */
  var carimbos = document.querySelector('[data-carimbos]');
  if (carimbos && 'IntersectionObserver' in window) {
    var obsCar = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { carimbos.classList.add('batidos'); obsCar.disconnect(); }
    }, { threshold: 0.6 });
    obsCar.observe(carimbos);
  }

  /* ---------- animações ---------- */
  if (temGsap && !reduz) {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.to('.hero__titulo [data-hero-anim]', { y: 0, duration: 1.3, ease: EASE, stagger: 0.12, delay: 0.1 });
    gsap.from('.hero__texto > [data-hero-anim]', { y: 16, duration: 1.2, ease: EASE, stagger: 0.08, delay: 0.3 });
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: EASE, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    if (anat) window.ScrollTrigger.create({ trigger: anat, start: 'top top', end: 'bottom bottom', onUpdate: function (st) { progressoAnatomia(st.progress); } });
    gsap.fromTo('.fecho__fundo', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.fecho', start: 'top bottom', end: 'bottom top', scrub: true } });
  } else if (anat && !reduz) {
    window.addEventListener('scroll', function () {
      var r = anat.getBoundingClientRect();
      progressoAnatomia(Math.min(1, Math.max(0, -r.top / (anat.offsetHeight - window.innerHeight))));
    }, { passive: true });
  }

  /* ---------- dúvidas: abrir uma fecha a anterior ---------- */
  var faqs = Array.prototype.slice.call(document.querySelectorAll('.duvidas__lista details'));
  var DUR = reduz ? 0 : 420;
  function animaAltura(el, de, para, fim) {
    if (!DUR || !el.animate) { if (fim) fim(); return; }
    var feito = false;
    var termina = function () { if (feito) return; feito = true; if (fim) fim(); };
    var a = el.animate([{ height: de + 'px', opacity: de ? 1 : 0 }, { height: para + 'px', opacity: para ? 1 : 0 }], { duration: DUR, easing: 'cubic-bezier(.16,1,.3,1)' });
    a.onfinish = termina;
    setTimeout(termina, DUR + 80);
  }
  function fechaFaq(d) { var r = d.querySelector('p'); animaAltura(r, r.offsetHeight, 0, function () { d.open = false; }); }
  function abreFaq(d) { d.open = true; var r = d.querySelector('p'); animaAltura(r, 0, r.offsetHeight); }
  faqs.forEach(function (d) {
    d.removeAttribute('name');
    d.querySelector('summary').addEventListener('click', function (e) {
      e.preventDefault();
      if (d.open) { fechaFaq(d); return; }
      faqs.forEach(function (o) { if (o !== d && o.open) fechaFaq(o); });
      abreFaq(d);
    });
  });

  /* ---------- pedido de demonstração ---------- */
  var modal = document.querySelector('[data-modal]');
  var msgEl = modal.querySelector('[data-modal-msg]');
  var ultimoFoco = null;
  function abreModal(msg) {
    ultimoFoco = document.activeElement;
    msgEl.textContent = msg === 'mapa' ? 'Abriria o Google Maps com a rota até a hamburgueria.' : '“' + msg + '”';
    modal.hidden = false;
    if (lenis) lenis.stop();
    modal.querySelector('.botao').focus();
  }
  function fechaModal() { modal.hidden = true; if (lenis) lenis.start(); if (ultimoFoco) ultimoFoco.focus(); }
  document.querySelectorAll('[data-pedido]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); abreModal(el.dataset.pedido); });
  });
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-modal-fechar]')) fechaModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) fechaModal(); });
})();
