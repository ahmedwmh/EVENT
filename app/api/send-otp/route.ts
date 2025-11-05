import { NextRequest, NextResponse } from "next/server"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { rateLimit } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 requests per 5 minutes per IP
    const clientIp = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    
    if (!rateLimit(clientIp, 3, 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً" },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "رقم الهاتف مطلوب" },
        { status: 400 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in response (in production, you might want to store it in Redis with expiration)
    // For now, we'll return it and the client will send it back for verification
    
    // Send OTP via WhatsApp
    const message = `رمز التاكيد الخاص بك هو: ${otp}\n\nاستخدم هذا الرمز لإكمال عملية التسجيل.\n\n`
    
    const sent = await sendWhatsAppMessage({
      to: phoneNumber,
      body: message
    })

    if (!sent) {
      return NextResponse.json(
        { error: "فشل إرسال رمز التاكيد. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      )
    }

    // Return OTP (in production, hash it and store server-side)
    // For now, return it so client can verify
    return NextResponse.json(
      { 
        success: true, 
        otp: otp, // In production, don't return this - verify server-side
        message: "تم إرسال رمز التاكيد بنجاح"
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال رمز التاكيد" },
      { status: 500 }
    )
  }
}

