import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding admin users...")

  // Hash passwords for admins
  const hashedPassword1 = await bcrypt.hash("admin123", 10)
  const hashedPassword2 = await bcrypt.hash("admin456", 10)

  // Create first admin user
  const admin1 = await prisma.admin.upsert({
    where: { username: "admin" },
    update: {
      password: hashedPassword1,
      email: "admin@event.com",
      isActive: true,
    },
    create: {
      username: "admin",
      password: hashedPassword1,
      email: "admin@event.com",
      isActive: true,
    },
  })

  console.log("✅ Admin 1 created:", {
    id: admin1.id,
    username: admin1.username,
    email: admin1.email,
  })

  // Create second admin user
  const admin2 = await prisma.admin.upsert({
    where: { username: "admin2" },
    update: {
      password: hashedPassword2,
      email: "admin2@event.com",
      isActive: true,
    },
    create: {
      username: "admin2",
      password: hashedPassword2,
      email: "admin2@event.com",
      isActive: true,
    },
  })

  console.log("✅ Admin 2 created:", {
    id: admin2.id,
    username: admin2.username,
    email: admin2.email,
  })

  console.log("\n📋 Default Admin Credentials:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("👤 Admin 1:")
  console.log("   Email: admin@event.com")
  console.log("   Password: admin123")
  console.log("\n👤 Admin 2:")
  console.log("   Email: admin2@event.com")
  console.log("   Password: admin456")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Error seeding:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
