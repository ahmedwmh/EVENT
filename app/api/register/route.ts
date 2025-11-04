import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { registrationSchema } from "@/lib/validation"
import { rateLimit, sanitizeString, sanitizePhone } from "@/lib/security"
import { sendWhatsAppMessage, generateRegistrationMessage } from "@/lib/whatsapp"
import { getEventDate, formatEventDate } from "@/lib/date-utils"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per 15 minutes per IP
    const clientIp = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    
    if (!rateLimit(clientIp, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً" },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validate with Zod
    const validationResult = registrationSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "البيانات غير صحيحة",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { name, phoneNumber, city, message } = validationResult.data

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeString(name),
      phoneNumber: sanitizePhone(phoneNumber),
      city: sanitizeString(city),
      message: message ? sanitizeString(message) : null,
    }

    // Insert registration using Prisma (unique constraint will handle duplicates)
    try {
      const registration = await prisma.registration.create({
        data: {
          name: sanitizedData.name,
          phoneNumber: sanitizedData.phoneNumber,
          city: sanitizedData.city,
          message: sanitizedData.message,
        },
        select: {
          id: true,
          name: true,
          city: true,
          createdAt: true,
        },
      })

      // Send WhatsApp confirmation message (non-blocking)
      // Don't await - send in background so it doesn't block the response
      ;(async () => {
        try {
          // Get event date
          const eventDate = getEventDate()
          const formattedEventDate = formatEventDate(eventDate)

          // Generate message
          const whatsappMessage = generateRegistrationMessage(
            sanitizedData.name,
            sanitizedData.city,
            formattedEventDate
          )

          // Send WhatsApp message
          await sendWhatsAppMessage({
            to: sanitizedData.phoneNumber,
            body: whatsappMessage,
          })
        } catch (whatsappError) {
          // Silently fail - don't block registration if WhatsApp fails
        }
      })()

      return NextResponse.json(
        { success: true, id: registration.id },
        { status: 201 }
      )
    } catch (error: any) {
      // Handle unique constraint violation (duplicate phone number)
      if (error.code === "P2002" && error.meta?.target?.includes("phone_number")) {
        return NextResponse.json(
          { error: "رقم الهاتف مسجل مسبقاً" },
          { status: 409 }
        )
      }
      
      // Handle Prisma connection/permission errors
      if (error.code === "P1001" || error.message?.includes("permission") || error.message?.includes("403")) {
        return NextResponse.json(
          { error: "خطأ في الاتصال بقاعدة البيانات. يرجى التحقق من إعدادات قاعدة البيانات." },
          { status: 500 }
        )
      }
      
      throw error // Re-throw if it's a different error
    }
  } catch (error: any) {
    // Handle specific error types
    if (error.code === "P1001" || error.message?.includes("permission") || error.message?.includes("403")) {
      return NextResponse.json(
        { error: "خطأ في الاتصال بقاعدة البيانات. تأكد من إعداد DATABASE_URL بشكل صحيح." },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حفظ التسجيل" },
      { status: 500 }
    )
  }
}
