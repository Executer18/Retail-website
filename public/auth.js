// public/auth.js
//
// Shared by every auth page (login, signup, forgot-password, reset-password).
// Each page's <form> gets data-auth-endpoint + data-auth-success attributes;
// this script reads them, so the actual page files stay tiny and identical
// in shape. One place to fix a bug in "how a form talks to Better Auth"
// instead of four.

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-auth-form]')
  if (!form) return

  const endpoint = form.dataset.authEndpoint
  const successUrl = form.dataset.authSuccess
  const successMessage = form.dataset.authSuccessMessage
  const messageBox = document.getElementById('auth-message')
  const submitBtn = form.querySelector('button[type="submit"]')

  function showMessage(text, kind) {
    messageBox.textContent = text
    messageBox.style.display = 'block'
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    messageBox.style.display = 'none'
    submitBtn.disabled = true
    submitBtn.textContent = submitBtn.dataset.loadingText || 'Please wait...'

    const body = Object.fromEntries(new FormData(form).entries())

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        // Better Auth's error responses carry a human-readable "message"
        showMessage(data.message || 'Something went wrong. Please try again.', 'error')
        submitBtn.disabled = false
        submitBtn.textContent = submitBtn.dataset.defaultText || 'Submit'
        return
      }

      if (successMessage) {
        showMessage(successMessage, 'success')
        form.reset()
        submitBtn.disabled = false
        submitBtn.textContent = submitBtn.dataset.defaultText || 'Submit'
      } else if (successUrl) {
        window.location.href = successUrl
      }
    } catch (err) {
      showMessage('Could not reach the server. Check your connection and try again.', 'error')
      submitBtn.disabled = false
      submitBtn.textContent = submitBtn.dataset.defaultText || 'Submit'
    }
  })
})