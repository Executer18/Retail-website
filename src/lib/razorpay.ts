// src/lib/razorpay.ts
//
// Everything that talks to Razorpay or checks one of its signatures.
// Uses only Web APIs (fetch, crypto.subtle, btoa), so it runs on Workers and on Node 19+.

import type { Env } from '../db'

const encoder = new TextEncoder()

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Constant-time string compare, so a signature can't be guessed byte by byte.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function razorpayConfigured(env: Env): boolean {
  return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
}

// Test keys start with rzp_test_ — used to show the "test mode" hint on the pay page.
export function razorpayTestMode(env: Env): boolean {
  return !!env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID.startsWith('rzp_test_')
}

// Creates a Razorpay order for an amount WE decided (in paise). Returns null on any failure.
export async function createRazorpayOrder(
  env: Env,
  args: { amountPaise: number; receipt: string; notes?: Record<string, string> }
): Promise<{ id: string } | null> {
  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: args.amountPaise,
        currency: 'INR',
        receipt: args.receipt,
        notes: args.notes ?? {},
      }),
    })
    const data: any = await res.json()
    if (!res.ok || !data?.id) {
      console.error('[razorpay] could not create order', res.status, JSON.stringify(data?.error ?? data))
      return null
    }
    return { id: String(data.id) }
  } catch (err) {
    console.error('[razorpay] order request failed', err)
    return null
  }
}

// Browser callback check: HMAC_SHA256(key_secret, "<razorpay_order_id>|<razorpay_payment_id>").
// razorpayOrderId must be the one stored in OUR database, never one sent by the browser.
export async function verifyPaymentSignature(
  env: Env,
  razorpayOrderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  if (!env.RAZORPAY_KEY_SECRET || !signature) return false
  const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${razorpayOrderId}|${paymentId}`)
  return safeEqual(expected, signature)
}

// Webhook check: HMAC_SHA256(webhook_secret, <raw request body>) vs the x-razorpay-signature header.
export async function verifyWebhookSignature(env: Env, rawBody: string, signature: string): Promise<boolean> {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false
  const expected = await hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody)
  return safeEqual(expected, signature)
}