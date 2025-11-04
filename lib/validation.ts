import { z } from "zod"

// Iraqi cities in Arabic
const iraqiCities = [
  "بغداد",
  "البصرة",
  "الموصل",
  "أربيل",
  "السليمانية",
  "كركوك",
  "الناصرية",
  "النجف",
  "كربلاء",
  "الحلة",
  "بعقوبة",
  "الديوانية",
  "رمادي",
  "سامراء",
  "تكريت",
  "الكوت",
  "علي الغربي",
  "الحي",
  "الفلوجة",
  "هيت",
  "حديثة",
  "الأنبار",
  "زاخو",
  "دهوك",
  "سنجار",
  "تلعفر",
  "الحضر",
  "كرخانة",
  "شيروان",
  "خانقين",
  "مندلي",
  "بلد",
  "الشرقاط",
  "الشامية",
  "الكاظمية",
  "الرصافة",
  "الكرخ",
  "الراشدية",
  "أبو غريب",
  "المدائن",
] as const

// Iraqi phone number validation
// Formats: 07XXXXXXXXX (11 digits) or +9647XXXXXXXX (15 digits)
function validateIraqiPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s\-]/g, "")
  
  // Normalize to check format
  let normalized = cleaned
  if (cleaned.startsWith("+964")) {
    // Convert +9647XXXXXXXXX to 07XXXXXXXXX
    normalized = "0" + cleaned.slice(4)
  } else if (cleaned.startsWith("964")) {
    // Convert 9647XXXXXXXXX to 07XXXXXXXXX
    normalized = "0" + cleaned.slice(3)
  }
  
  // Remove any remaining non-digits
  normalized = normalized.replace(/\D/g, "")
  
  // Must be exactly 11 digits starting with 07
  // Format: 07XXXXXXXXX (0 + 7 + 9 digits = 11 total)
  if (normalized.length !== 11) {
    return false
  }
  
  if (!normalized.startsWith("07")) {
    return false
  }
  
  // All remaining 9 digits should be numbers
  const remainingDigits = normalized.slice(2)
  if (!/^\d{9}$/.test(remainingDigits)) {
    return false
  }
  
  return true
}

export const registrationSchema = z.object({
  name: z
    .string()
    .min(2, "الاسم يجب أن يكون على الأقل حرفين")
    .max(100, "الاسم طويل جداً")
    .regex(/^[\u0600-\u06FF\s\w]+$/, "الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط"),
  phoneNumber: z
    .string()
    .min(11, "رقم الهاتف يجب أن يكون 11 رقم")
    .max(15, "رقم الهاتف طويل جداً")
    .refine(
      (phone) => validateIraqiPhone(phone),
      {
        message: "رقم الهاتف غير صحيح. يجب أن يكون رقم عراقي (مثال: 07901234567 أو +9647901234567)"
      }
    ),
  city: z.enum([...iraqiCities] as [string, ...string[]], {
    errorMap: () => ({ message: "يرجى اختيار مدينة صحيحة من القائمة" }),
  }),
  message: z
    .string()
    .max(1000, "الرسالة طويلة جداً (الحد الأقصى 1000 حرف)")
    .optional()
    .default(""),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>

// Export cities for use in UI
export const iraqiCitiesList = iraqiCities as readonly string[]
