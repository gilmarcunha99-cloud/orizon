/* Orizon Pass — comportamento do protótipo web.
   IMPORTANTE: protótipo visual. Nada é enviado a servidor; não há autenticação real.
   O backend (envio de código por e-mail, criação de conta, login) entra numa fase seguinte. */
(function () {
  'use strict';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var $ = function (id) { return document.getElementById(id); };
  var show = function (el, on) { if (el) el.classList.toggle('hidden', !on); };

  // Mostrar/ocultar senha (um botão pode controlar vários campos)
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ids = btn.getAttribute('data-toggle-password').split(',');
      var reveal = $(ids[0]).type === 'password';
      ids.forEach(function (id) { $(id).type = reveal ? 'text' : 'password'; });
      btn.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  // ---------- Tela Entrar ----------
  var formEntrar = $('form-entrar');
  if (formEntrar) {
    formEntrar.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailOk = EMAIL_RE.test($('email').value.trim());
      var senhaOk = $('senha').value.length > 0;
      $('field-email').classList.toggle('error', !emailOk);
      $('field-senha').classList.toggle('error', !senhaOk);
      show($('erro-login'), !(emailOk && senhaOk));
      if (emailOk && senhaOk) { show($('btn-entrar'), false); show($('login-ok'), true); }
    });
  }

  // ---------- Tela Primeiro acesso ----------
  if (!$('primeiro-acesso')) return;

  var state = { step: 1, timer: null, secs: 0 };
  var steps = [$('step1'), $('step2'), $('step3')];
  var bodies = [$('step1-body'), $('step2-body'), $('step3-body')];
  var CHECK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';

  function render() {
    steps.forEach(function (el, i) {
      var n = i + 1;
      el.classList.toggle('done', n < state.step);
      el.classList.toggle('locked', n > state.step);
      show(bodies[i], n === state.step);
      el.querySelector('.dot').innerHTML = n < state.step ? CHECK : String(n);
    });
    $('step1-title').textContent = state.step > 1 ? $('email').value.trim() : 'Informe seu e-mail';
    show($('alterar-email'), state.step > 1);
  }

  function startTimer() {
    clearInterval(state.timer);
    state.secs = 45;
    var tick = function () {
      $('contador').textContent = 'Reenviar 0:' + (state.secs < 10 ? '0' : '') + state.secs;
      show($('contador'), state.secs > 0);
      show($('reenviar'), state.secs <= 0);
      if (state.secs <= 0) clearInterval(state.timer);
      state.secs--;
    };
    tick();
    state.timer = setInterval(tick, 1000);
  }

  $('enviar-codigo').addEventListener('click', function () {
    var ok = EMAIL_RE.test($('email').value.trim());
    $('field-email').classList.toggle('error', !ok);
    show($('erro-email'), !ok);
    if (!ok) return;
    $('email-enviado').textContent = $('email').value.trim();
    state.step = 2; render(); startTimer();
    $('codigo').focus();
  });

  $('alterar-email').addEventListener('click', function () {
    clearInterval(state.timer);
    $('codigo').value = ''; paintOtp();
    state.step = 1; render(); $('email').focus();
  });

  $('reenviar').addEventListener('click', startTimer);

  var boxes = document.querySelectorAll('#otp .box');
  function paintOtp() {
    var v = $('codigo').value;
    boxes.forEach(function (b, i) {
      b.textContent = v[i] || '';
      b.classList.toggle('active', i === Math.min(v.length, 5));
    });
  }
  $('codigo').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    paintOtp();
    show($('erro-codigo'), false);
  });

  $('confirmar').addEventListener('click', function () {
    // Protótipo: qualquer código de 6 dígitos é aceito.
    var ok = $('codigo').value.length === 6;
    show($('erro-codigo'), !ok);
    if (!ok) return;
    clearInterval(state.timer);
    state.step = 3; render(); $('nova').focus();
  });

  function checkPassword() {
    var p = $('nova').value, c = $('confirma').value;
    var rules = { len: p.length >= 8, letra: /[A-Za-zÀ-ÿ]/.test(p), num: /\d/.test(p) };
    document.querySelectorAll('#regras li').forEach(function (li) {
      li.classList.toggle('ok', !!rules[li.getAttribute('data-rule')]);
    });
    var match = c.length > 0 && c === p;
    $('field-confirma').classList.toggle('ok', match);
    $('field-confirma').classList.toggle('error', c.length > 0 && !match);
    return rules.len && rules.letra && rules.num && match;
  }
  $('nova').addEventListener('input', checkPassword);
  $('confirma').addEventListener('input', checkPassword);

  $('criar-conta').addEventListener('click', function () {
    var ok = state.step === 3 && checkPassword();
    show($('erro-criar'), !ok);
    if (!ok) return;
    show($('criar-conta'), false);
    show($('conta-ok'), true);
    setTimeout(function () { window.location.href = '/'; }, 1800);
  });

  render();
})();
