import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrCode } = body

    if (!qrCode || typeof qrCode !== "string") {
      return NextResponse.json(
        { error: "رمز QR Code مطلوب" },
        { status: 400 }
      )
    }

    // Find registration by invitation code
    const registration = await prisma.registration.findUnique({
      where: { invitationCode: qrCode.trim().toUpperCase() },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        city: true,
        firstPersonName: true,
        secondPersonName: true,
        qrCodeScanned: true,
        qrCodeScannedAt: true,
        familyAccepted: true,
        attended: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { 
          error: "رمز QR Code غير صحيح",
          valid: false,
        },
        { status: 404 }
      )
    }

    // Check if already scanned
    if (registration.qrCodeScanned) {
      return NextResponse.json(
        {
          success: true,
          valid: true,
          alreadyScanned: true,
          scannedAt: registration.qrCodeScannedAt,
          registration: {
            id: registration.id,
            name: registration.name,
            city: registration.city,
            firstPersonName: registration.firstPersonName,
            secondPersonName: registration.secondPersonName,
          },
        },
        { status: 200 }
      )
    }

    // Mark as scanned
    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        qrCodeScanned: true,
        qrCodeScannedAt: new Date(),
        attended: true, // Also mark as attended
      },
    })

    return NextResponse.json(
      {
        success: true,
        valid: true,
        alreadyScanned: false,
        scannedAt: updated.qrCodeScannedAt,
        registration: {
          id: registration.id,
          name: registration.name,
          city: registration.city,
          firstPersonName: registration.firstPersonName,
          secondPersonName: registration.secondPersonName,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء التحقق من QR Code" },
      { status: 500 }
    )
  }
}

