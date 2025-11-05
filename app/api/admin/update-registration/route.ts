import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sanitizeString } from "@/lib/security"
import { sendWhatsAppImage, generateQRCode } from "@/lib/whatsapp"

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, invitationSent, familyAccepted, notes, attended } = body

    if (!id) {
      return NextResponse.json(
        { error: "معرف التسجيل مطلوب" },
        { status: 400 }
      )
    }

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: "التسجيل غير موجود" },
        { status: 404 }
      )
    }

    // Check if family is being accepted for the first time
    const wasAccepted = existingRegistration.familyAccepted
    const isBeingAccepted = familyAccepted !== undefined && Boolean(familyAccepted) && !wasAccepted

    // Update registration
    const updatedRegistration = await prisma.registration.update({
      where: { id },
      data: {
        ...(invitationSent !== undefined && { invitationSent: Boolean(invitationSent) }),
        ...(familyAccepted !== undefined && { familyAccepted: Boolean(familyAccepted) }),
        ...(notes !== undefined && { notes: notes ? sanitizeString(notes) : null }),
        ...(attended !== undefined && { attended: Boolean(attended) }),
      },
    })

    // If family is being accepted for the first time, send QR Code
    if (isBeingAccepted && updatedRegistration.otpCode) {
      // Send QR Code in background (non-blocking)
      ;(async () => {
        try {
          // Generate QR Code with OTP
          const qrCodeData = updatedRegistration.otpCode || updatedRegistration.id

          // Generate QR Code image
          const qrCodeBase64 = await generateQRCode(qrCodeData)

          // Send QR Code image with a message
          const qrMessage = `مرحباً ${updatedRegistration.name} 👋\n\nتم قبول تسجيلك! ✅\n\nيرجى استخدام رمز QR Code هذا للدخول إلى الحدث.\n\n© 2025 تجمع الفنانين`

          await sendWhatsAppImage({
            to: updatedRegistration.phoneNumber,
            imageBase64: qrCodeBase64,
            caption: qrMessage
          })
        } catch (whatsappError) {
          // Silently fail - don't block update if WhatsApp fails
        }
      })()
    }

    return NextResponse.json(
      { success: true, registration: updatedRegistration },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث التسجيل" },
      { status: 500 }
    )
  }
}

