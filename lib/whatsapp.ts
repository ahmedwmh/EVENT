/**
 * Send WhatsApp message using UltraMsg.com API
 */

import QRCode from "qrcode"

interface WhatsAppMessageParams {
  to: string
  body: string
}

interface WhatsAppImageParams {
  to: string
  imageUrl?: string
  imageBase64?: string
  caption?: string
}

/**
 * Convert Iraqi phone number to international format for WhatsApp
 * UltraMsg.com accepts formats: +964XXXXXXXXXX or 964XXXXXXXXXX (without +)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove spaces and non-digits except +
  let cleaned = phone.replace(/[\s\-]/g, "")
  
  // If starts with 0, replace with +964
  if (cleaned.startsWith("0")) {
    const withoutZero = cleaned.slice(1)
    // Return +964XXXXXXXXXX format
    return "+964" + withoutZero
  }
  
  // If starts with 964, ensure it has +
  if (cleaned.startsWith("964")) {
    return "+" + cleaned
  }
  
  // If already has +, return as is
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  
  // Otherwise, assume it's local format and add +964
  return "+964" + cleaned
}

/**
 * Alternative format without + (some APIs prefer this)
 */
export function formatPhoneForWhatsAppNoPlus(phone: string): string {
  const withPlus = formatPhoneForWhatsApp(phone)
  // Remove + if present
  return withPlus.replace(/^\+/, "")
}

export async function sendWhatsAppMessage({ to, body }: WhatsAppMessageParams): Promise<boolean> {
  const token = process.env.MESSAGE_TOKEN
  const instanceId = process.env.MESSAGE_INSTANCE_ID
  // Clean up appUrl - remove trailing spaces and slashes
  const appUrl = (process.env.MESSAGE_APP_URL || "https://api.ultramsg.com").trim().replace(/\/+$/, "")

  if (!token || !instanceId) {
    // WhatsApp API credentials not configured
    return false
  }

  // Format phone number to international format
  // UltraMsg.com typically prefers format without + (964XXXXXXXXXX)
  const formattedPhone = formatPhoneForWhatsAppNoPlus(to)

  try {
    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded")

    const urlencoded = new URLSearchParams()
    urlencoded.append("token", token)
    urlencoded.append("to", formattedPhone)
    urlencoded.append("body", body)

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow" as RequestRedirect,
    }

    // Build URL - check if appUrl already contains instance ID
    let url: string
    if (appUrl.includes(instanceId)) {
      // appUrl already contains instance ID (e.g., https://api.ultramsg.com/instance148630/)
      // Just append the endpoint
      const cleanAppUrl = appUrl.replace(/\/$/, "") // Remove trailing slash
      url = `${cleanAppUrl}/messages/chat`
    } else {
      // appUrl is base URL (e.g., https://api.ultramsg.com)
      // Add instance ID and endpoint
      url = `${appUrl}/${instanceId}/messages/chat`
    }

    const response = await fetch(url, requestOptions)
    const result = await response.text()

    // Try to parse JSON response
    let parsedResult: any = null
    try {
      parsedResult = JSON.parse(result)
    } catch (e) {
      // Response is not JSON
    }

    // Check if response indicates success
    // UltraMsg.com typically returns JSON with "sent": true/false or "error" field
    // Also check for other success indicators like "id" or "messageId"
    if (parsedResult) {
      // Check for success indicators
      const isSuccess = 
        parsedResult.sent === true || 
        parsedResult.sent === "true" ||
        parsedResult.id ||
        parsedResult.messageId ||
        (parsedResult.error === false && parsedResult.sent !== false)
      
      if (isSuccess) {
        return true
      }
      
      // Check for error indicators
      if (parsedResult.error || parsedResult.errorMessage || parsedResult.message) {
        return false
      }
      
      // If response has sent: false explicitly
      if (parsedResult.sent === false) {
        return false
      }
    }

    // Check HTTP status
    if (!response.ok) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Generate QR Code as base64 image
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    // Generate QR Code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    })
    // Extract base64 part (remove data:image/png;base64, prefix)
    return qrCodeDataUrl.split(",")[1]
  } catch (error) {
    throw new Error("Failed to generate QR code")
  }
}

/**
 * Send WhatsApp image using UltraMsg.com API
 */
export async function sendWhatsAppImage({ to, imageUrl, imageBase64, caption }: WhatsAppImageParams): Promise<boolean> {
  const token = process.env.MESSAGE_TOKEN
  const instanceId = process.env.MESSAGE_INSTANCE_ID
  const appUrl = (process.env.MESSAGE_APP_URL || "https://api.ultramsg.com").trim().replace(/\/+$/, "")

  if (!token || !instanceId) {
    return false
  }

  // Format phone number
  const formattedPhone = formatPhoneForWhatsAppNoPlus(to)

  try {
    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded")

    const urlencoded = new URLSearchParams()
    urlencoded.append("token", token)
    urlencoded.append("to", formattedPhone)
    
    // Use imageUrl if provided, otherwise use base64
    if (imageUrl) {
      urlencoded.append("image", imageUrl)
    } else if (imageBase64) {
      // For base64, we need to send it as a data URL
      urlencoded.append("image", `data:image/png;base64,${imageBase64}`)
    } else {
      return false
    }
    
    if (caption) {
      urlencoded.append("caption", caption)
    }

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow" as RequestRedirect,
    }

    // Build URL for image endpoint
    let url: string
    if (appUrl.includes(instanceId)) {
      const cleanAppUrl = appUrl.replace(/\/$/, "")
      url = `${cleanAppUrl}/messages/image`
    } else {
      url = `${appUrl}/${instanceId}/messages/image`
    }

    const response = await fetch(url, requestOptions)
    const result = await response.text()

    // Try to parse JSON response
    let parsedResult: any = null
    try {
      parsedResult = JSON.parse(result)
    } catch (e) {
      // Response is not JSON
    }

    // Check if response indicates success
    if (parsedResult) {
      const isSuccess = 
        parsedResult.sent === true || 
        parsedResult.sent === "true" ||
        parsedResult.id ||
        parsedResult.messageId ||
        (parsedResult.error === false && parsedResult.sent !== false)
      
      if (isSuccess) {
        return true
      }
      
      if (parsedResult.error || parsedResult.errorMessage || parsedResult.message) {
        return false
      }
      
      if (parsedResult.sent === false) {
        return false
      }
    }

    if (!response.ok) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

// This function is now deprecated - messages come from settings
// Keeping for backward compatibility
export function generateRegistrationMessage(name: string, city: string, eventDate: string): string {
  return `مرحباً ${name} 👋

تم تسجيلك بالمهرجان بنجاح! ✅

📍 المدينة: ${city}
📅 تاريخ الحدث: ${eventDate}

نحن سعداء بانضمامك إلينا. سيتم التواصل معك قريباً عبر رقم الهاتف المقدم للتفاصيل الإضافية.`
}

// Generate personalized message from template
export function personalizeMessage(template: string, data: { name?: string; city?: string; eventDate?: string }): string {
  let message = template
  if (data.name) {
    message = message.replace(/{name}/g, data.name)
  }
  if (data.city) {
    message = message.replace(/{city}/g, data.city)
  }
  if (data.eventDate) {
    message = message.replace(/{eventDate}/g, data.eventDate)
  }
  return message
}

