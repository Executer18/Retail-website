// public/product-detail.js
//
// Three independent behaviors on the product detail page:
//   1. Gallery dots sync to horizontal scroll position
//   2. Quantity stepper (+/-), capped at available stock
//   3. Fullscreen image viewer: opens on tapping any gallery image, closes
//      on tapping the close button OR swiping/scrolling down past a
//      threshold (the "slides in/down to close" gesture you asked for)
//
// No build step, no framework — this is intentionally plain DOM code,
// consistent with the rest of the project's htmx-first approach. Only this
// one page needs anything beyond htmx, because image-viewer gesture
// handling isn't something htmx attributes can express.

document.addEventListener('DOMContentLoaded', () => {
  // ---------- 1. Gallery dots ----------
  const scroller = document.getElementById('gallery-scroller')
  const dotsContainer = document.getElementById('gallery-dots')
  if (scroller && dotsContainer) {
    const dots = Array.from(dotsContainer.children)
    scroller.addEventListener('scroll', () => {
      const index = Math.round(scroller.scrollLeft / scroller.clientWidth)
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index))
    })
  }

  // ---------- 2. Quantity stepper ----------
  // Lives inside the fixed bottom bar now, not inline in the page — same
  // element, same data attributes, just moved by the page markup/CSS.
  const stepper = document.querySelector('[data-qty-stepper]')
  if (stepper) {
    const max = parseFloat(stepper.dataset.max || '1')
    const valueEl = stepper.querySelector('[data-qty-value]')
    const decreaseBtn = stepper.querySelector('[data-qty-decrease]')
    const increaseBtn = stepper.querySelector('[data-qty-increase]')
    const totalEl = document.querySelector('[data-cart-line-total]')
    const pricePerKg = parseFloat(stepper.dataset.pricePerKg || '0')

    function getValue() {
      return parseInt(valueEl.textContent || '1', 10)
    }
    function setValue(next) {
      const clamped = Math.max(1, Math.min(next, Math.floor(max)))
      valueEl.textContent = String(clamped)
      decreaseBtn.disabled = clamped <= 1
      increaseBtn.disabled = clamped >= Math.floor(max)
      if (totalEl && pricePerKg) {
        totalEl.textContent = '₹' + (pricePerKg * clamped).toFixed(2)
      }
    }

    decreaseBtn.addEventListener('click', () => setValue(getValue() - 1))
    increaseBtn.addEventListener('click', () => setValue(getValue() + 1))
    setValue(1)
  }

  // ---------- 3. Fullscreen image viewer ----------
  const viewer = document.getElementById('image-viewer')
  const viewerScroller = document.getElementById('image-viewer-scroller')
  const closeBtn = document.getElementById('image-viewer-close')
  const gallerySlides = document.querySelectorAll('[data-open-viewer]')

  if (viewer && viewerScroller) {
    function openViewer(index) {
      viewer.classList.add('is-open')
      document.body.style.overflow = 'hidden'
      const slideWidth = viewerScroller.clientWidth
      viewerScroller.scrollTo({ left: index * slideWidth, behavior: 'auto' })
    }

    function closeViewer() {
      viewer.classList.remove('is-open')
      document.body.style.overflow = ''
    }

    gallerySlides.forEach((slide) => {
      slide.addEventListener('click', () => {
        const index = parseInt(slide.dataset.index || '0', 10)
        openViewer(index)
      })
    })

    closeBtn.addEventListener('click', closeViewer)

    // Swipe/drag down to close — the "slides down to close" gesture.
    let startY = null
    let currentTranslateY = 0

    viewer.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY
      viewer.style.transition = 'none'
    })

    viewer.addEventListener('touchmove', (e) => {
      if (startY === null) return
      const deltaY = e.touches[0].clientY - startY
      if (deltaY > 0) {
        currentTranslateY = deltaY
        viewer.style.transform = `translateY(${deltaY}px)`
      }
    })

    viewer.addEventListener('touchend', () => {
      viewer.style.transition = ''
      viewer.style.transform = ''
      if (currentTranslateY > 120) {
        closeViewer()
      }
      startY = null
      currentTranslateY = 0
    })

    // Keyboard support (Esc to close) for non-touch devices
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && viewer.classList.contains('is-open')) {
        closeViewer()
      }
    })
  }
})
