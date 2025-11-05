import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { rateLimit } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 1 request per 5 minutes per IP
    const clientIp = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    
    if (!rateLimit(clientIp, 1, 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً" },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { message, phoneNumbers } = body

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "الرسالة مطلوبة" },
        { status: 400 }
      )
    }

    // Get all registrations if phoneNumbers not provided
    let targetPhoneNumbers: string[] = []
    
    if (phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
      targetPhoneNumbers = phoneNumbers
    } else {
      // Get all registered phone numbers
      const registrations = await prisma.registration.findMany({
        select: {
          phoneNumber: true,
        },
      })
      targetPhoneNumbers = registrations.map((r) => r.phoneNumber)
    }

    if (targetPhoneNumbers.length === 0) {
      return NextResponse.json(
        { error: "لا توجد أرقام هاتف لإرسال الرسائل إليها" },
        { status: 400 }
      )
    }

    // Send messages with delay between each to avoid rate limiting
    const results = {
      total: targetPhoneNumbers.length,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ phone: string; error: string }>,
    }

    // Send messages one by one with delay
    for (let i = 0; i < targetPhoneNumbers.length; i++) {
      const phone = targetPhoneNumbers[i]
      
      try {
        // Add personalization if message contains {name}
        let personalizedMessage = message
        
        // Try to get user name for personalization
        if (message.includes("{name}")) {
          const registration = await prisma.registration.findFirst({
            where: { phoneNumber: phone },
            select: { name: true },
          })
          
          if (registration) {
            personalizedMessage = message.replace(/{name}/g, registration.name)
          }
        }

        const sent = await sendWhatsAppMessage({
          to: phone,
          body: personalizedMessage,
        })

        if (sent) {
          results.sent++
        } else {
          results.failed++
          results.errors.push({
            phone,
            error: "فشل الإرسال",
          })
        }

        // Add delay between messages (500ms) to avoid rate limiting
        if (i < targetPhoneNumbers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          phone,
          error: error.message || "حدث خطأ أثناء الإرسال",
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال الرسائل" },
      { status: 500 }
    )
  }
}

