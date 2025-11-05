"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings, Save, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

function SettingsContent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState("")
  const [invitationMessage, setInvitationMessage] = useState("")

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings")
      if (!response.ok) {
        throw new Error("فشل تحميل الإعدادات")
      }
      return response.json()
    },
  })

  // Update settings when data is loaded
  useEffect(() => {
    if (data?.settings) {
      setRegistrationSuccessMessage(data.settings.registrationSuccessMessage || "")
      setInvitationMessage(data.settings.invitationMessage || "")
    }
  }, [data])

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: {
      registrationSuccessMessage: string
      invitationMessage: string
    }) => {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل حفظ الإعدادات")
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      registrationSuccessMessage,
      invitationMessage,
    })
  }

  if (isLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة إلى لوحة الإدارة
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            إعدادات الرسائل
          </h1>
          <p className="text-muted-foreground">تخصيص رسائل WhatsApp المرسلة للمستخدمين</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Registration Success Message */}
          <Card>
            <CardHeader>
              <CardTitle>رسالة نجاح التسجيل</CardTitle>
              <CardDescription>
                هذه الرسالة يتم إرسالها تلقائياً عند نجاح تسجيل المستخدم
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registration-message">نص الرسالة</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  يمكنك استخدام المتغيرات: {"{name}"} - {"{city}"} - {"{eventDate}"}
                </p>
                <textarea
                  id="registration-message"
                  value={registrationSuccessMessage}
                  onChange={(e) => setRegistrationSuccessMessage(e.target.value)}
                  placeholder="اكتب رسالة نجاح التسجيل هنا..."
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invitation Message */}
          <Card>
            <CardHeader>
              <CardTitle>رسالة إرسال الدعوة</CardTitle>
              <CardDescription>
                هذه الرسالة يتم إرسالها عند الضغط على زر إرسال دعوة في الجدول
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitation-message">نص الرسالة</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  يمكنك استخدام المتغيرات: {"{name}"} - {"{city}"} - {"{eventDate}"}
                </p>
                <textarea
                  id="invitation-message"
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  placeholder="اكتب رسالة الدعوة هنا..."
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              {saveMutation.isError && (
                <div className="mb-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {saveMutation.error instanceof Error
                      ? saveMutation.error.message
                      : "فشل حفظ الإعدادات"}
                  </span>
                </div>
              )}

              {saveMutation.isSuccess && (
                <div className="mb-4 flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ الإعدادات بنجاح!</span>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full"
                size="lg"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsContent />
    </QueryClientProvider>
  )
}

