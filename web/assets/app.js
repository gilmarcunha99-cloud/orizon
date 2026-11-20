/* Orizon Pass — comportamento do protótipo web.
   IMPORTANTE: protótipo visual. Nada é enviado a servidor; não há autenticação real.
   Cadastro de usuários ORIZON é feito pelo administrador no app web; não há "primeiro acesso" nesta tela. */
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
})();
