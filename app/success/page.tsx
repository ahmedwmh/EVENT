"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Calendar, MapPin, Phone, User, ArrowRight, Home } from "lucide-react"
import Link from "next/link"
import { formatEventDate, getEventDate } from "@/lib/date-utils"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [registrationData, setRegistrationData] = useState<{
    name?: string
    city?: string
    phoneNumber?: string
  } | null>(null)

  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [eventDateString, setEventDateString] = useState("")

  useEffect(() => {
    // Get data from URL params or localStorage
    const name = searchParams.get("name") || (typeof window !== "undefined" ? localStorage.getItem("registration_name") : null)
    const city = searchParams.get("city") || (typeof window !== "undefined" ? localStorage.getItem("registration_city") : null)
    const phoneNumber = searchParams.get("phone") || (typeof window !== "undefined" ? localStorage.getItem("registration_phone") : null)

    if (name && city) {
      setRegistrationData({ name, city, phoneNumber: phoneNumber || undefined })
      // Clear localStorage after reading
      if (typeof window !== "undefined") {
        localStorage.removeItem("registration_name")
        localStorage.removeItem("registration_city")
        localStorage.removeItem("registration_phone")
      }
    } else if (!name && !city) {
      // Redirect to home if no data
      router.push("/")
    }

    // Calculate event date only on client
    const date = getEventDate()
    setEventDate(date)
    setEventDateString(formatEventDate(date))
  }, [searchParams, router])

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative bg-green-500/10 rounded-full p-6">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
          </div>
        </div>

        {/* Success Card */}
        <Card className="border-2 border-green-500/20 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-3xl md:text-4xl font-bold text-green-600">
              تم التسجيل بنجاح! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              تم استلام تسجيلك بنجاح في تجمع الفنانين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Registration Details */}
            <div className="bg-accent/30 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4 text-center">تفاصيل التسجيل</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-semibold">{registrationData.name}</p>
                  </div>
                </div>

                {registrationData.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                      <p className="font-semibold">{registrationData.phoneNumber}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المدينة</p>
                    <p className="font-semibold">{registrationData.city}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الحدث</p>
                    <p className="font-semibold">
                      {eventDateString || "جاري التحميل..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-gray-800 dark:bg-gray-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-gray-100 dark:text-blue-100">
                معلومات مهمة
              </h4>
              <ul className="space-y-2 text-sm text-gray-100 dark:text-blue-200 list-disc list-inside">
                <li>سيتم التواصل معك قريباً عبر رقم الهاتف المقدم</li>
                <li>احتفظ بهذه الصفحة كإثبات لتسجيلك</li>
                <li>تأكد من أن رقم الهاتف صحيح ويمكن الوصول إليه</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1" size="lg">
                <Link href="/" className="flex  items-center justify-center p-2">
                  <Home className="w-4 h-4 ml-2" />
                  العودة للصفحة الرئيسية
                </Link>
              </Button>
              <Button
                variant="outline"
                className="flex-1 p-2"
                size="lg"
                onClick={() => window.print()}
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                طباعة التأكيد
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 تجمع الفنانين. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}

