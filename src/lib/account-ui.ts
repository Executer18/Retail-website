// src/lib/account-ui.ts
//
// CSS + browser JS for AccountPage.tsx. Builds on checkout-ui.ts (same `ck-`
// prefix / `--ck-` variables). The form submissions for login, signup, forgot
// and reset are handled by public/auth.js; this file's JS only opens/closes the
// popups and handles Edit Profile, Logout and the small toast.

import { CHECKOUT_CSS } from './checkout-ui'

export const ACCOUNT_CSS =
  CHECKOUT_CSS +
  `
/* ---------- Account page ---------- */
.ck-account{padding-bottom:calc(var(--ck-nav-h) + 16px)}
.ck-acct-head{margin:14px;background:var(--ck-surface);border:1.5px solid var(--ck-border);
  border-radius:var(--ck-soft);padding:18px;display:flex;align-items:center;gap:14px}
.ck-acct-avatar{width:58px;height:58px;flex:none;border-radius:50%;background:var(--ck-primary-light);
  display:grid;place-items:center;font-size:24px;font-weight:800;color:var(--ck-primary-dark)}
.ck-acct-head__txt{min-width:0}
.ck-acct-head__txt b{font-size:16px;color:var(--ck-ink);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ck-acct-head__txt span{font-size:12px;color:var(--ck-muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ck-acct-edit{margin-left:auto;flex:none;font-size:12px;font-weight:800;color:var(--ck-primary);
  border:1.5px solid var(--ck-primary);padding:7px 14px;border-radius:var(--ck-round);transition:transform var(--ck-fast)}
.ck-acct-edit:active{transform:scale(.96)}
.ck-authbtns{display:flex;gap:10px;margin:14px}
.ck-authbtns button{flex:1;padding:13px;border-radius:var(--ck-crisp);font-weight:800;font-size:13.5px;transition:transform var(--ck-fast)}
.ck-authbtns button:active{transform:scale(.97)}
.ck-authbtns .login{background:var(--ck-primary);color:#fff}
.ck-authbtns .signup{border:1.5px solid var(--ck-primary);color:var(--ck-primary)}
.ck-menu{margin:0 14px;background:var(--ck-surface);border:1.5px solid var(--ck-border);
  border-radius:var(--ck-soft);overflow:hidden}
.ck-menu__item{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;font-size:13.5px;
  font-weight:600;color:var(--ck-ink);border-bottom:1px solid var(--ck-border);text-align:left;
  transition:background var(--ck-fast)}
.ck-menu__item:last-child{border-bottom:none}
.ck-menu__item:hover{background:var(--ck-gold-light)}
.ck-menu__item .em{font-size:18px}
.ck-menu__item .arr{margin-left:auto;color:var(--ck-muted)}
.ck-menu__item:disabled{opacity:.6;cursor:default}

/* ---------- Centered popups ---------- */
.ck-noscroll{overflow:hidden}
.ck-modal-back{position:fixed;inset:0;z-index:200;background:rgba(33,27,23,.55);
  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  display:flex;align-items:center;justify-content:center;padding:16px;
  opacity:0;visibility:hidden;pointer-events:none;
  transition:opacity var(--ck-base) ease,visibility 0s linear var(--ck-base)}
.ck-modal-back.open{opacity:1;visibility:visible;pointer-events:auto;transition:opacity var(--ck-base) ease}
.ck-modal{position:relative;width:100%;max-width:400px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);
  overflow-y:auto;background:var(--ck-surface);border-radius:18px;padding:26px 22px 22px;
  box-shadow:0 24px 60px rgba(33,27,23,.28);transform:translateY(14px) scale(.96);
  transition:transform .28s cubic-bezier(.34,1.3,.5,1)}
.ck-modal-back.open .ck-modal{transform:none}
.ck-modal__close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;
  background:var(--ck-gold-light);display:grid;place-items:center;font-size:16px;font-weight:700;
  color:var(--ck-ink);transition:background var(--ck-fast),transform var(--ck-fast)}
.ck-modal__close:hover{background:var(--ck-primary-light);color:var(--ck-primary-dark)}
.ck-modal__close:active{transform:scale(.92)}
.ck-modal h3{font-size:19px;font-weight:800;color:var(--ck-ink);margin:0;padding-right:40px;
  display:flex;align-items:center;gap:8px}
.ck-modal__sub{font-size:12.5px;color:var(--ck-muted);margin:5px 0 18px;line-height:1.5}
.ck-modal .ck-field input{padding:12px 14px}
.ck-modal .ck-pw input{padding-right:62px}
.ck-pw{position:relative}
.ck-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:11.5px;font-weight:800;
  color:var(--ck-primary);padding:7px 9px;border-radius:var(--ck-crisp)}
.ck-modal-go{width:100%;margin-top:6px;background:var(--ck-primary);color:#fff;padding:14px;
  border-radius:var(--ck-crisp);font-weight:800;font-size:14px;letter-spacing:.03em;
  transition:transform var(--ck-fast),opacity var(--ck-fast)}
.ck-modal-go:active{transform:scale(.98)}
.ck-modal-go:disabled{opacity:.65;cursor:default}
.ck-auth-alt{text-align:center;font-size:12.5px;color:var(--ck-muted);margin:14px 0 0}
.ck-auth-alt + .ck-auth-alt{margin-top:8px}
.ck-link{color:var(--ck-primary);font-weight:800;padding:0;font-size:inherit;text-decoration:underline;
  text-underline-offset:2px}
.ck-msg{display:none;margin-bottom:14px;padding:10px 12px;border-radius:var(--ck-crisp);font-size:12.5px;line-height:1.5}
.ck-msg--error{background:#fee2e2;color:var(--ck-danger)}
.ck-msg--success{background:var(--ck-success-bg);color:var(--ck-success)}
.ck-modal input:focus-visible,.ck-modal button:focus-visible,.ck-menu__item:focus-visible,
.ck-authbtns button:focus-visible,.ck-acct-edit:focus-visible{outline:2px solid var(--ck-primary);outline-offset:2px}

@media (prefers-reduced-motion:reduce){
  .ck-modal-back,.ck-modal{transition:none}
}
`

export const ACCOUNT_JS = `
(function () {
  var root = document.getElementById('ck-account');
  if (!root) return;

  var returnTo = root.getAttribute('data-return-to') || '/account';
  var PATHS = { login: '/login', signup: '/signup', forgot: '/forgot-password', reset: '/reset-password' };
  var current = null, lastFocus = null, toastEl = null, toastT;

  /* ---------- toast ---------- */
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ck-toast';
      toastEl.setAttribute('role', 'status');
      root.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  function showMsg(box, text, kind) {
    box.textContent = text;
    box.className = 'ck-msg ck-msg--' + kind;
    box.style.display = 'block';
  }

  /* ---------- URL follows the open popup (so a refresh keeps it) ---------- */
  function setUrl(name) {
    if (!window.history || !history.replaceState) return;
    var url = '/account';
    if (name === 'reset') {
      url = PATHS.reset + location.search; // keep ?token=
    } else if (name && PATHS[name]) {
      url = PATHS[name];
      if ((name === 'login' || name === 'signup') && returnTo !== '/account') {
        url += '?redirect=' + encodeURIComponent(returnTo);
      }
    }
    history.replaceState(null, '', url);
  }

  /* ---------- open / close ---------- */
  function openModal(name) {
    var back = document.getElementById('ck-modal-' + name);
    if (!back) return;
    if (current && current !== back) current.classList.remove('open');
    if (!current) lastFocus = document.activeElement;
    current = back;
    back.classList.add('open');
    document.body.classList.add('ck-noscroll');
    if (PATHS[name]) setUrl(name);
    var first = back.querySelector('input:not([type=hidden])');
    setTimeout(function () {
      var target = first && first.offsetParent !== null ? first : back.querySelector('.ck-modal__close');
      if (target) target.focus();
    }, 60);
  }

  function closeModal() {
    if (!current) return;
    var wasAuth = !!PATHS[current.getAttribute('data-modal')];
    current.classList.remove('open');
    current = null;
    document.body.classList.remove('ck-noscroll');
    if (wasAuth) setUrl(null);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var opener = t.closest('[data-open-modal]');
    if (opener && root.contains(opener)) {
      e.preventDefault();
      openModal(opener.getAttribute('data-open-modal'));
      return;
    }
    if (t.closest('[data-close-modal]')) { closeModal(); return; }
    if (t.classList.contains('ck-modal-back')) { closeModal(); return; }

    var eye = t.closest('.ck-eye');
    if (eye) {
      var input = eye.parentNode.querySelector('input');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.textContent = show ? 'Hide' : 'Show';
      eye.setAttribute('aria-pressed', show ? 'true' : 'false');
      return;
    }

    var toastBtn = t.closest('[data-toast]');
    if (toastBtn) { toast(toastBtn.getAttribute('data-toast')); }
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var all = current.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled])');
    var list = [];
    for (var i = 0; i < all.length; i++) { if (all[i].offsetParent !== null) list.push(all[i]); }
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- reset-password popup: read ?token= from the emailed link ---------- */
  var resetForm = document.getElementById('ck-reset-form');
  if (resetForm) {
    var token = new URLSearchParams(location.search).get('token');
    if (token) {
      document.getElementById('ck-reset-token').value = token;
    } else {
      resetForm.style.display = 'none';
      document.getElementById('ck-reset-warning').style.display = 'block';
    }
  }

  /* ---------- Edit Profile ---------- */
  var editForm = document.getElementById('ck-edit-form');
  if (editForm) {
    var editMsg = document.getElementById('ck-edit-msg');
    var nameEl = document.getElementById('ck-edit-name');
    var phoneEl = document.getElementById('ck-edit-phone');
    var editBtn = editForm.querySelector('button[type="submit"]');

    phoneEl.addEventListener('input', function () {
      phoneEl.value = phoneEl.value.replace(/[^0-9]/g, '').slice(0, 10);
    });

    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      editMsg.style.display = 'none';
      var name = nameEl.value.trim();
      var phone = phoneEl.value.trim();
      if (name.length < 2) { showMsg(editMsg, 'Please enter your name.', 'error'); return; }
      if (phone && !/^[0-9]{10}$/.test(phone)) { showMsg(editMsg, 'Enter a valid 10-digit phone number.', 'error'); return; }

      editBtn.disabled = true;
      editBtn.textContent = 'Saving...';

      fetch('/account/profile', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, phone: phone })
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (r) {
          if (!r.ok) throw new Error(r.data && r.data.message ? r.data.message : 'Could not save your profile.');
          var avName = document.getElementById('ck-av-name');
          var avInit = document.getElementById('ck-av-init');
          var avSub = document.getElementById('ck-av-sub');
          avName.textContent = r.data.name;
          avInit.textContent = r.data.name.charAt(0).toUpperCase();
          avSub.textContent = r.data.phone ? '+91 ' + r.data.phone : (avSub.getAttribute('data-email') || '');
          closeModal();
          toast('Profile saved');
        })
        .catch(function (err) {
          showMsg(editMsg, err.message || 'Could not save your profile.', 'error');
        })
        .then(function () {
          editBtn.disabled = false;
          editBtn.textContent = 'Save Profile';
        });
    });
  }

  /* ---------- Logout ---------- */
  var logout = document.querySelector('[data-logout]');
  if (logout) {
    logout.addEventListener('click', function () {
      logout.disabled = true;
      fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
        .then(function (res) {
          if (!res.ok) throw new Error('failed');
          window.location.href = '/account';
        })
        .catch(function () {
          logout.disabled = false;
          toast('Could not log out. Please try again.');
        });
    });
  }

  /* ---------- open the popup the route asked for (/login, /signup, ...) ---------- */
  var initial = root.getAttribute('data-initial-popup');
  if (initial) openModal(initial);
})();
`