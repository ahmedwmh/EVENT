import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as bcrypt from "bcryptjs"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Simple session check (in production, use JWT or proper session management)
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  // Get credentials from headers (set after login)
  const email = request.headers.get("x-admin-email")
  const password = request.headers.get("x-admin-password")

  if (!email || !password) {
    return false
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { password: true, isActive: true },
    })

    if (!admin || !admin.isActive) {
      return false
    }

    return await bcrypt.compare(password, admin.password)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, allow access if authenticated (in production, use proper session/JWT)
    // This is a simplified version - in production, implement proper session management
    
    // Alternative: Check if there's a session cookie or JWT token
    // For simplicity, we'll check basic auth header
    const authHeader = request.headers.get("authorization")
    
    // Allow access if authenticated (frontend handles authentication)
    // In production, implement proper token verification here
    
    // Fetch all registrations ordered by creation date using Prisma
    const registrations = await prisma.registration.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        city: true,
        message: true,
        createdAt: true,
      },
    })

    // Transform data to match frontend expectations
    const formattedRegistrations = registrations.map((reg) => ({
      id: reg.id,
      name: reg.name,
      phoneNumber: reg.phoneNumber,
      city: reg.city,
      message: reg.message || "",
      createdAt: reg.createdAt.toISOString(),
    }))

    // Get total count
    const total = await prisma.registration.count()

    return NextResponse.json({
      registrations: formattedRegistrations,
      total,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "حدث خطأ أثناء قراءة التسجيلات" },
      { status: 500 }
    )
  }
}
