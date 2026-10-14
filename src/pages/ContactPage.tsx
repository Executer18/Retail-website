import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { CHECKOUT_CSS, STORE, hoursLabel } from '../lib/checkout-ui'

// Placeholder details taken from the design — replace with your real ones.
const CONTACT = {
  whatsappNumber: '919876543210', // country code + number, digits only
  whatsappText: 'Hi Annapurna Chakki!',
  email: 'hello@annapurnachakki.in',
  emailSubject: 'Query',
  phoneDisplay: '+91 98765 43210',
  mapEmbedUrl: 'https://maps.google.com/maps?q=Grain%20Market%20Pune&t=&z=14&ie=UTF8&iwloc=&output=embed',
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do you deliver?',
    a: "No — we're pickup only. Order online, choose a slot, and collect from the store. This keeps every bag freshly ground on your order day.",
  },
  {
    q: 'Can I bring my own grain for grinding?',
    a: 'Yes! Use the grinding-charge calculator on the home page for a quick quote, drop your grain at the counter, and we return 100% of your flour with a written slip.',
  },
  {
    q: 'What is your return policy?',
    a: 'Sealed packs can be returned or exchanged within 2 days of pickup with the batch slip. For quality issues in opened packs, we regrind or replace free.',
  },
  {
    q: 'How fresh is the flour?',
    a: "Every order is milled after you place it — nothing sits on a shelf longer than 48 hours. You'll see the milling date on your pack.",
  },
  {
    q: 'Do you add anything to the atta?',
    a: 'Never. No maida mixing, no bleaching, no preservatives — every batch is lab-checked and ground at low RPM on stone.',
  },
]

const CONTACT_CSS =
  CHECKOUT_CSS +
  `
/* ---------- Contact ---------- */
.ck-hero{margin:14px;background:var(--ck-surface);border:1.5px solid var(--ck-border);
  border-radius:var(--ck-soft);padding:18px;text-align:center}
.ck-hero__em{font-size:44px;display:block}
.ck-hero h3{font-size:18px;margin:6px 0 2px;color:var(--ck-ink)}
.ck-hero p{font-size:12.5px;color:var(--ck-muted);margin:0}
.ck-cbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 14px 14px}
.ck-cbtn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:var(--ck-crisp);
  font-weight:800;font-size:13px;color:#fff;transition:transform var(--ck-fast)}
.ck-cbtn:active{transform:scale(.96)}
.ck-cbtn--wa{background:#1faa53}
.ck-cbtn--mail{background:var(--ck-primary)}
.ck-sec--flush{margin-top:0}
.ck-sec--flush p{font-size:13px;line-height:1.6}
.ck-mapembed{margin:0 14px 16px;border-radius:var(--ck-soft);overflow:hidden;border:1.5px solid var(--ck-border)}
.ck-mapembed iframe{width:100%;height:220px;border:0;display:block}
.ck-mapbtn-wrap{margin:0 14px 16px}
.ck-faqhead{margin:4px 16px 10px;font-size:14px;font-weight:800;color:var(--ck-ink)}
.ck-faq{margin:0 14px 14px}
.ck-faq details{background:var(--ck-surface);border:1.5px solid var(--ck-border);border-radius:var(--ck-soft);
  margin-bottom:8px;overflow:hidden}
.ck-faq summary{padding:13px 15px;font-size:13px;font-weight:700;color:var(--ck-ink);cursor:pointer;
  list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px}
.ck-faq summary::-webkit-details-marker{display:none}
.ck-faq summary::after{content:'+';font-size:17px;color:var(--ck-primary);transition:transform .25s;flex:none}
.ck-faq details[open] summary::after{transform:rotate(45deg)}
.ck-faq details p{padding:0 15px 13px;margin:0;font-size:12.5px;color:var(--ck-body);line-height:1.6}
`

export const ContactPage: FC = () => {
  const waHref = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(CONTACT.whatsappText)}`
  const mailHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.emailSubject)}`
  const telHref = `tel:+${CONTACT.whatsappNumber}`

  return (
    <Layout title="Contact Us" description={`Contact ${STORE.name} — WhatsApp, email, store address and FAQs.`}>
      <style dangerouslySetInnerHTML={{ __html: CONTACT_CSS }} />

      <div class="ck">
        <h1 class="ck-sr">Contact Us</h1>

        <div class="ck-hero">
          <span class="ck-hero__em">💬</span>
          <h3>We're at the counter, talk to us</h3>
          <p>{hoursLabel()} · Replies within a few hours</p>
        </div>

        <div class="ck-cbtns">
          <a class="ck-cbtn ck-cbtn--wa" href={waHref} target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5 13.6c-.2.6-1.2 1.2-1.7 1.2-.4 0-.9.2-3-.6-2.5-1-4.1-3.6-4.2-3.8-.1-.2-1-1.3-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .6-.2 1.2Z" />
            </svg>
            WhatsApp Us
          </a>
          <a class="ck-cbtn ck-cbtn--mail" href={mailHref}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 6 10-6" />
            </svg>
            Email Us
          </a>
        </div>

        <div class="ck-sec ck-sec--flush">
          <h4>🏪 Visit the Store</h4>
          <p>
            {STORE.line1}
            <br />
            {STORE.line2}
            <br />
            📞 <a href={telHref}>{CONTACT.phoneDisplay}</a>
          </p>
        </div>

        <div class="ck-mapembed">
          <iframe
            loading="lazy"
            title="Store location map"
            referrerpolicy="no-referrer-when-downgrade"
            src={CONTACT.mapEmbedUrl}
          ></iframe>
        </div>
        <div class="ck-mapbtn-wrap">
          <a class="ck-map-btn" href={STORE.mapsUrl} target="_blank" rel="noopener">
            📍 Open in Google Maps →
          </a>
        </div>

        <h2 class="ck-faqhead">Frequently asked</h2>
        <div class="ck-faq">
          {FAQS.map((f) => (
            <details>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Layout>
  )
}