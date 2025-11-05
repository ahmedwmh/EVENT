import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage, sendWhatsAppImage, generateQRCode } from "@/lib/whatsapp"
import { getEventDate, formatEventDate } from "@/lib/date-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationIds } = body

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json(
        { error: "يجب تحديد معرفات التسجيلات" },
        { status: 400 }
      )
    }

    // Get settings for invitation message
    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({
        data: {},
      })
    }

    // Get registrations
    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        city: true,
        invitationSent: true,
        invitationCode: true,
      },
    })

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "لا توجد تسجيلات موجودة" },
        { status: 404 }
      )
    }

    // Get event date
    const eventDate = getEventDate()
    const formattedEventDate = formatEventDate(eventDate)

    const results = {
      total: registrations.length,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    }

    // Send messages with delay
    for (let i = 0; i < registrations.length; i++) {
      const registration = registrations[i]
      
      try {
        // Generate or get invitation code
        let invitationCode = registration.invitationCode
        if (!invitationCode) {
          // Generate unique invitation code (8 alphanumeric characters)
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          do {
            invitationCode = Array.from({ length: 8 }, () => 
              chars.charAt(Math.floor(Math.random() * chars.length))
            ).join('')
            // Check if code already exists
            const existing = await prisma.registration.findUnique({
              where: { invitationCode },
            })
            if (!existing) break
          } while (true)
        }

        // Personalize message
        let personalizedMessage = settings.invitationMessage
          .replace(/{name}/g, registration.name)
          .replace(/{city}/g, registration.city)
          .replace(/{eventDate}/g, formattedEventDate)

        // Generate QR Code with invitation code
        const qrCodeData = invitationCode
        const qrCodeBase64 = await generateQRCode(qrCodeData)

        // Send QR Code image with the message as caption
        const sent = await sendWhatsAppImage({
          to: registration.phoneNumber,
          imageBase64: qrCodeBase64,
          caption: personalizedMessage,
        })

        if (sent) {
          results.sent++
          // Update invitationSent status and save invitation code
          await prisma.registration.update({
            where: { id: registration.id },
            data: { 
              invitationSent: true,
              invitationCode: invitationCode,
            },
          })
        } else {
          results.failed++
          results.errors.push({
            id: registration.id,
            error: "فشل الإرسال",
          })
        }

        // Add delay between messages (500ms)
        if (i < registrations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          id: registration.id,
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
      { error: error.message || "حدث خطأ أثناء إرسال الدعوات" },
      { status: 500 }
    )
  }
}

