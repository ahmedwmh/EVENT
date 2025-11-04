// Simple rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export function rateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Input sanitization
export function sanitizeString(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/[<>]/g, "")
}

export function sanitizePhone(phone: string): string {
  // Remove spaces, dashes, and other non-digit characters except + at the start
  let cleaned = phone.replace(/[\s\-()]/g, "")
  
  // Normalize Iraqi phone numbers to 07XXXXXXXXX format (11 digits)
  if (cleaned.startsWith("+964")) {
    // Convert +9647XXXXXXXX to 07XXXXXXXXX
    cleaned = "0" + cleaned.slice(4)
  } else if (cleaned.startsWith("964")) {
    // Convert 9647XXXXXXXX to 07XXXXXXXXX
    cleaned = "0" + cleaned.slice(3)
  } else if (cleaned.startsWith("+")) {
    // Remove leading + if it's not +964
    cleaned = cleaned.slice(1)
  }
  
  // Remove any remaining non-digits
  cleaned = cleaned.replace(/\D/g, "")
  
  // Ensure it starts with 0 and has correct length
  if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned
  }
  
  // Ensure it's exactly 11 digits
  if (cleaned.length > 11) {
    cleaned = cleaned.slice(0, 11)
  }
  
  return cleaned
}

// Validate phone format (Iraq)
export function isValidPhone(phone: string): boolean {
  const cleanPhone = sanitizePhone(phone)
  // Iraqi phone format: 07XXXXXXXXX (11 digits starting with 07)
  // Second digit must be 7, third digit can be 0-9, followed by 8 more digits
  return /^07\d{9}$/.test(cleanPhone) && cleanPhone.length === 11
}
