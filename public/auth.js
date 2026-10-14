// public/auth.js
//
// Shared handler for every auth form (login, signup, forgot-password,
// reset-password). Each <form data-auth-form> carries:
//   data-auth-endpoint         Better Auth URL to POST the fields to (as JSON)
//   data-auth-success          URL to go to after success   (or)
//   data-auth-success-message  text to show after success instead of redirecting
//
// Change from the old version: it now wires up EVERY [data-auth-form] on the
// page (the account page holds four popups at once) and each form shows its
// messages in its own popup. Old full-page forms with <div id="auth-message">
// keep working.

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-auth-form]').forEach(initAuthForm)
})

function initAuthForm(form) {
  const endpoint = form.dataset.authEndpoint
  const successUrl = form.dataset.authSuccess
  const successMessage = form.dataset.authSuccessMessage
  const submitBtn = form.querySelector('button[type="submit"]')

  // Popup: the message box inside the same card. Old pages: #auth-message.
  const card = form.closest('[data-auth-card]')
  const messageBox = (card && card.querySelector('[data-auth-message]')) || document.getElementById('auth-message')
  const isPopupBox = !!(messageBox && messageBox.hasAttribute('data-auth-message'))

  function showMessage(text, kind) {
    if (!messageBox) return
    messageBox.textContent = text
    messageBox.style.display = 'block'

    if (isPopupBox) {
      // styled by .ck-msg--error / .ck-msg--success in the account page CSS
      messageBox.className = 'ck-msg ck-msg--' + kind
      return
    }
    messageBox.style.padding = 'var(--space-3)'
    messageBox.style.borderRadius = 'var(--radius-crisp)'
    if (kind === 'error') {
      messageBox.style.background = 'var(--color-danger-bg)'
      messageBox.style.color = 'var(--color-danger)'
    } else {
      messageBox.style.background = 'var(--color-success-bg)'
      messageBox.style.color = 'var(--color-success)'
    }
  }

  function hideMessage() {
    if (messageBox) messageBox.style.display = 'none'
  }

  function resetButton() {
    submitBtn.disabled = false
    submitBtn.textContent = submitBtn.dataset.defaultText || 'Submit'
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideMessage()
    submitBtn.disabled = true
    submitBtn.textContent = submitBtn.dataset.loadingText || 'Please wait...'

    const body = Object.fromEntries(new FormData(form).entries())

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      // Some endpoints can answer with an empty body — don't let that throw.
      let data = {}
      try {
        data = await res.json()
      } catch (_) {}

      if (!res.ok) {
        // Better Auth's error responses carry a human-readable "message"
        showMessage((data && data.message) || 'Something went wrong. Please try again.', 'error')
        resetButton()
        return
      }

      if (successMessage) {
        showMessage(successMessage, 'success')
        form.reset()
        resetButton()
      } else if (successUrl) {
        // keep the button disabled while the browser navigates
        window.location.href = successUrl
      } else {
        resetButton()
      }
    } catch (err) {
      showMessage('Could not reach the server. Check your connection and try again.', 'error')
      resetButton()
    }
  })
}