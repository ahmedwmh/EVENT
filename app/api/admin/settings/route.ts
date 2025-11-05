import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sanitizeString } from "@/lib/security"

export async function GET() {
  try {
    // Get settings or create default if not exists
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      // Create default settings
      settings = await prisma.settings.create({
        data: {},
      })
    }

    return NextResponse.json({ success: true, settings }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب الإعدادات" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationSuccessMessage, invitationMessage } = body

    // Get or create settings
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {},
      })
    }

    // Update settings
    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        ...(registrationSuccessMessage !== undefined && {
          registrationSuccessMessage: sanitizeString(registrationSuccessMessage),
        }),
        ...(invitationMessage !== undefined && {
          invitationMessage: sanitizeString(invitationMessage),
        }),
      },
    })

    return NextResponse.json(
      { success: true, settings: updatedSettings },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حفظ الإعدادات" },
      { status: 500 }
    )
  }
}

