/**
 * Format date consistently to avoid hydration mismatches
 * Uses Gregorian calendar format in Arabic
 */
export function formatEventDate(date: Date): string {
  // Use a consistent format that works across server and client
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ]
  
  return `${day} ${months[month]} ${year}`
}

/**
 * Get event date (November 15, 2025 at 6:00 PM local time)
 */
export function getEventDate(): Date {
  // Event date: November 15, 2025 at 6:00 PM (18:00) local time
  const date = new Date(2025, 10, 15, 18, 0, 0, 0) // Month is 0-indexed, so 10 = November, 18 = 6 PM
  return date
}

/**
 * Format date with time in Gregorian calendar (Arabic)
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ]
  
  const ampm = hours >= 12 ? "م" : "ص"
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, "0")
  
  return `${day} ${months[month]} ${year} في ${displayHours}:${displayMinutes} ${ampm}`
}

