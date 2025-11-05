"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Users, Lock, Download, Search, Mail, AlertCircle, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Phone, MapPin, MessageSquare, Send, Edit, Check, X as XIcon, QrCode, CheckCircle2, XCircle, Settings } from "lucide-react"
import { iraqiCitiesList } from "@/lib/validation"
import { formatDateTime } from "@/lib/date-utils"
import Link from "next/link"

interface Registration {
  id: string
  name: string
  phoneNumber: string
  city: string
  message: string
  firstPersonName?: string
  secondPersonName?: string
  invitationSent?: boolean
  familyAccepted?: boolean
  notes?: string
  attended?: boolean
  otpCode?: string
  invitationCode?: string
  qrCodeScanned?: boolean
  qrCodeScannedAt?: string
  createdAt: string
}

type SortField = "name" | "city" | "createdAt" | "phoneNumber"
type SortDirection = "asc" | "desc" | null

const AUTH_KEY = "admin_authenticated"
const AUTH_EMAIL_KEY = "admin_email"

function AdminContent() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("")
  const [invitationFilter, setInvitationFilter] = useState<string>("all") // "all" | "sent" | "not-sent"
  const [qrCodeFilter, setQrCodeFilter] = useState<string>("all") // "all" | "has" | "not-has"
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false)
  const [bulkMessage, setBulkMessage] = useState("")
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null)
  const [editFormData, setEditFormData] = useState({
    invitationSent: false,
    notes: "",
    attended: false,
  })
  const [selectedRegistrations, setSelectedRegistrations] = useState<Set<string>>(new Set())
  const [qrCodeInput, setQrCodeInput] = useState("")
  const [qrVerificationStatus, setQrVerificationStatus] = useState<{
    status: "idle" | "verifying" | "success" | "error"
    message?: string
  }>({ status: "idle" })

  // Check authentication status on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const savedAuth = localStorage.getItem(AUTH_KEY)
      const savedEmail = localStorage.getItem(AUTH_EMAIL_KEY)
      if (savedAuth === "true" && savedEmail) {
        setIsAuthenticated(true)
        setEmail(savedEmail)
      }
    }
  }, [])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل تسجيل الدخول")
      }

      return result
    },
    onSuccess: (data, variables) => {
      setIsAuthenticated(true)
      setPassword("") // Clear password after successful login
      // Save authentication state to localStorage
      localStorage.setItem(AUTH_KEY, "true")
      localStorage.setItem(AUTH_EMAIL_KEY, variables.email.trim())
    },
  })

  const { data, isLoading, error } = useQuery<{
    registrations: Registration[]
    total: number
  }>({
    queryKey: ["registrations", isAuthenticated],
    queryFn: async () => {
      const response = await fetch("/api/registrations")
      if (!response.ok) {
        throw new Error("فشل تحميل البيانات")
      }
      return response.json()
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      loginMutation.mutate({ email: email.trim(), password })
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setEmail("")
    setPassword("")
    setSearchTerm("")
    setSelectedCity("")
    setSortField(null)
    setSortDirection(null)
    // Clear authentication state from localStorage
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(AUTH_EMAIL_KEY)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleExport = () => {
    if (filteredAndSortedRegistrations.length === 0) return

    const csv = [
      ["الاسم", "رقم الهاتف", "المدينة", "الرسالة", "تاريخ التسجيل"],
      ...filteredAndSortedRegistrations.map((r) => [
        r.name,
        r.phoneNumber,
        r.city,
        r.message || "",
        formatDateTime(new Date(r.createdAt)),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    const filterText = selectedCity ? `-${selectedCity}` : ""
    link.download = `registrations${filterText}-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  // Verify QR Code mutation
  const verifyQrMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await fetch("/api/admin/verify-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrCode }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل التحقق من QR Code")
      }

      return result
    },
    onSuccess: (data) => {
      if (data.valid && editingRegistration) {
        // Update attended status automatically
        setEditFormData((prev) => ({
          ...prev,
          attended: true,
        }))
        setQrVerificationStatus({
          status: "success",
          message: data.alreadyScanned
            ? "تم مسح هذا QR Code مسبقاً"
            : "تم التحقق بنجاح! تم تحديث حالة الحضور تلقائياً",
        })
        // Refresh registrations to get updated data
        queryClient.invalidateQueries({ queryKey: ["registrations"] })
      }
    },
    onError: (error: Error) => {
      setQrVerificationStatus({
        status: "error",
        message: error.message || "فشل التحقق من QR Code",
      })
    },
  })

  // Update registration mutation
  const updateRegistrationMutation = useMutation({
    mutationFn: async (data: { id: string; invitationSent?: boolean; familyAccepted?: boolean; notes?: string; attended?: boolean }) => {
      const response = await fetch("/api/admin/update-registration", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل تحديث التسجيل")
      }

      return result
    },
    onSuccess: () => {
      setEditingRegistration(null)
      // Refetch registrations
      queryClient.invalidateQueries({ queryKey: ["registrations"] })
    },
  })

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (registrationIds: string[]) => {
      const response = await fetch("/api/admin/send-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationIds }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل إرسال الدعوات")
      }

      return result
    },
    onSuccess: () => {
      setSelectedRegistrations(new Set())
      queryClient.invalidateQueries({ queryKey: ["registrations"] })
    },
  })

  // Bulk message mutation
  const bulkMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/admin/send-bulk-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "فشل إرسال الرسائل")
      }

      return result
    },
    onSuccess: () => {
      // Keep modal open to show results
      // User can close it manually
    },
  })

  // Filter and sort registrations
  const filteredAndSortedRegistrations = useMemo(() => {
    if (!data?.registrations) return []

    let filtered = [...data.registrations]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (reg) =>
          reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.phoneNumber.includes(searchTerm) ||
          reg.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply city filter
    if (selectedCity) {
      filtered = filtered.filter((reg) => reg.city === selectedCity)
    }

    // Apply invitation filter
    if (invitationFilter === "sent") {
      filtered = filtered.filter((reg) => reg.invitationSent === true)
    } else if (invitationFilter === "not-sent") {
      filtered = filtered.filter((reg) => reg.invitationSent === false)
    }

    // Apply QR Code filter
    if (qrCodeFilter === "has") {
      filtered = filtered.filter((reg) => reg.invitationCode && reg.invitationCode.trim() !== "")
    } else if (qrCodeFilter === "not-has") {
      filtered = filtered.filter((reg) => !reg.invitationCode || reg.invitationCode.trim() === "")
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number

        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case "city":
            aValue = a.city.toLowerCase()
            bValue = b.city.toLowerCase()
            break
          case "phoneNumber":
            aValue = a.phoneNumber
            bValue = b.phoneNumber
            break
          case "createdAt":
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data?.registrations, searchTerm, selectedCity, invitationFilter, qrCodeFilter, sortField, sortDirection])

  // Get unique cities from registrations for filter dropdown
  const availableCities = useMemo(() => {
    if (!data?.registrations) return []
    const cities = new Set(data.registrations.map((r) => r.city))
    return Array.from(cities).sort()
  }, [data?.registrations])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!data?.registrations) {
      return {
        total: 0,
        invitationsSent: 0,
        invitationsNotSent: 0,
        qrCodesScanned: 0,
        qrCodesNotScanned: 0,
        hasQrCode: 0,
        noQrCode: 0,
      }
    }

    const invitationsSent = data.registrations.filter((r) => r.invitationSent === true).length
    const invitationsNotSent = data.registrations.filter((r) => r.invitationSent === false).length
    const qrCodesScanned = data.registrations.filter((r) => r.qrCodeScanned === true).length
    const qrCodesNotScanned = data.registrations.filter((r) => r.qrCodeScanned === false).length
    const hasQrCode = data.registrations.filter((r) => r.invitationCode && r.invitationCode.trim() !== "").length
    const noQrCode = data.registrations.filter((r) => !r.invitationCode || r.invitationCode.trim() === "").length

    return {
      total: data.registrations.length,
      invitationsSent,
      invitationsNotSent,
      qrCodesScanned,
      qrCodesNotScanned,
      hasQrCode,
      noQrCode,
    }
  }, [data?.registrations])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center">تسجيل دخول الإدارة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@event.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-9"
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                    required
                    disabled={loginMutation.isPending}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                  />
                </div>
              </div>
              
              {loginMutation.isError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {loginMutation.error instanceof Error
                      ? loginMutation.error.message
                      : "فشل تسجيل الدخول"}
                  </span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending || !email || !password}
              >
                {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">لوحة الإدارة</h1>
            <p className="text-muted-foreground">إدارة تسجيلات الحدث</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/settings">
              <Button variant="outline">
                <Settings className="w-4 h-4 ml-2" />
                الإعدادات
              </Button>
            </Link>
            {selectedRegistrations.size > 0 && (
              <Button 
                onClick={() => {
                  sendInvitationMutation.mutate(Array.from(selectedRegistrations))
                }}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={sendInvitationMutation.isPending}
              >
                <Send className="w-4 h-4 ml-2" />
                إرسال دعوة ({selectedRegistrations.size})
              </Button>
            )}
            <Button 
              onClick={() => setShowBulkMessageModal(true)} 
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4 ml-2" />
              إرسال تذكير للجميع
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
            <Button onClick={handleLogout} variant="outline">
              تسجيل الخروج
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-8 text-center">
              <p className="text-destructive">حدث خطأ أثناء تحميل البيانات</p>
            </CardContent>
          </Card>
        )}

        {/* Send Invitation Success/Error Messages */}
        {sendInvitationMutation.isSuccess && sendInvitationMutation.data?.results && (
          <Card className="mb-6 border-green-500/20 bg-green-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-semibold">تم إرسال الدعوات بنجاح!</p>
                  <div className="text-sm mt-1 space-y-1">
                    <p>إجمالي: {sendInvitationMutation.data.results.total}</p>
                    <p>نجح: {sendInvitationMutation.data.results.sent}</p>
                    {sendInvitationMutation.data.results.failed > 0 && (
                      <p className="text-destructive">فشل: {sendInvitationMutation.data.results.failed}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sendInvitationMutation.isError && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span>
                  {sendInvitationMutation.error instanceof Error
                    ? sendInvitationMutation.error.message
                    : "فشل إرسال الدعوات"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Registration Modal */}
        {editingRegistration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  تعديل بيانات التسجيل - {editingRegistration.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم</Label>
                    <Input value={editingRegistration.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input value={editingRegistration.phoneNumber} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>المدينة</Label>
                    <Input value={editingRegistration.city} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الثلاثي للفرد الأول</Label>
                    <Input value={editingRegistration.firstPersonName || ""} disabled />
                  </div>
                  {editingRegistration.secondPersonName && (
                    <div className="space-y-2">
                      <Label>الاسم الثلاثي للفرد الثاني</Label>
                      <Input value={editingRegistration.secondPersonName} disabled />
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">حقول الإدارة</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="invitationSent"
                        checked={editFormData.invitationSent}
                        onChange={(e) => setEditFormData({ ...editFormData, invitationSent: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="invitationSent">تم إرسال رسالة دعوة</Label>
                    </div>

                    

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="attended"
                        checked={editFormData.attended}
                        onChange={(e) => setEditFormData({ ...editFormData, attended: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="attended">حضر</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">الملاحظات</Label>
                      <textarea
                        id="notes"
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        placeholder="أدخل الملاحظات هنا..."
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>

                {/* QR Code Verification Section */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">التحقق من QR Code</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="qr-code-input">أدخل أو امسح QR Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-code-input"
                          value={qrCodeInput}
                          onChange={(e) => {
                            setQrCodeInput(e.target.value.toUpperCase().trim())
                            setQrVerificationStatus({ status: "idle" })
                          }}
                          placeholder="أدخل رمز QR Code هنا..."
                          className="flex-1 dir-ltr text-center font-mono text-lg tracking-widest"
                          disabled={verifyQrMutation.isPending}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && qrCodeInput.trim()) {
                              verifyQrMutation.mutate(qrCodeInput.trim())
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            if (qrCodeInput.trim()) {
                              verifyQrMutation.mutate(qrCodeInput.trim())
                            }
                          }}
                          disabled={verifyQrMutation.isPending || !qrCodeInput.trim()}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {verifyQrMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                              جاري التحقق...
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4 ml-2" />
                              تحقق
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        أدخل رمز QR Code للتحقق من الحضور. سيتم تحديث حالة &quot;حضر&quot; تلقائياً عند التحقق الناجح.
                      </p>
                    </div>

                    {/* Verification Status Messages */}
                    {qrVerificationStatus.status === "success" && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded-md">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{qrVerificationStatus.message}</span>
                      </div>
                    )}

                    {qrVerificationStatus.status === "error" && (
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{qrVerificationStatus.message}</span>
                      </div>
                    )}

                    {/* Show invitation code if available */}
                    {editingRegistration?.invitationCode && (
                      <div className="bg-muted/50 border border-border p-3 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">رمز الدعوة المسجل:</p>
                        <p className="font-mono text-sm font-semibold dir-ltr text-center">
                          {editingRegistration.invitationCode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {updateRegistrationMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {updateRegistrationMutation.error instanceof Error
                        ? updateRegistrationMutation.error.message
                        : "فشل تحديث التسجيل"}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRegistration(null)
                      setQrCodeInput("")
                      setQrVerificationStatus({ status: "idle" })
                      updateRegistrationMutation.reset()
                      verifyQrMutation.reset()
                    }}
                    disabled={updateRegistrationMutation.isPending || verifyQrMutation.isPending}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => {
                      updateRegistrationMutation.mutate({
                        id: editingRegistration.id,
                        invitationSent: editFormData.invitationSent,
                        notes: editFormData.notes,
                        attended: editFormData.attended,
                      })
                    }}
                    disabled={updateRegistrationMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {updateRegistrationMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 ml-2" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Message Modal */}
        {showBulkMessageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  إرسال رسالة تذكيرية للجميع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-message">الرسالة</Label>
                  <textarea
                    id="bulk-message"
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="اكتب رسالة التذكير هنا... (يمكنك استخدام {name} لتضمين اسم المستخدم)"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground">
                    سيتم إرسال هذه الرسالة لجميع المستخدمين المسجلين ({data?.total || 0} مستخدم)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    استخدم {"{name}"} لتضمين اسم المستخدم في الرسالة
                  </p>
                </div>

                {bulkMessageMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {bulkMessageMutation.error instanceof Error
                        ? bulkMessageMutation.error.message
                        : "فشل إرسال الرسائل"}
                    </span>
                  </div>
                )}

                {bulkMessageMutation.isSuccess && bulkMessageMutation.data?.results && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-md p-4 space-y-2">
                    <p className="text-sm font-semibold text-green-600">تم الإرسال بنجاح!</p>
                    <div className="text-sm space-y-1">
                      <p>إجمالي: {bulkMessageMutation.data.results.total}</p>
                      <p className="text-green-600">نجح: {bulkMessageMutation.data.results.sent}</p>
                      {bulkMessageMutation.data.results.failed > 0 && (
                        <p className="text-destructive">فشل: {bulkMessageMutation.data.results.failed}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkMessageModal(false)
                      setBulkMessage("")
                      bulkMessageMutation.reset()
                    }}
                    disabled={bulkMessageMutation.isPending}
                  >
                    {bulkMessageMutation.isSuccess ? "إغلاق" : "إلغاء"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (bulkMessage.trim()) {
                        bulkMessageMutation.mutate(bulkMessage.trim())
                      }
                    }}
                    disabled={bulkMessageMutation.isPending || !bulkMessage.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {bulkMessageMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إرسال
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {data && (
          <>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-3xl font-bold">{data.total}</p>
                        <p className="text-muted-foreground">إجمالي المسجلين</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>عرض:</span>
                      <span className="font-semibold text-foreground">
                        {filteredAndSortedRegistrations.length}
                      </span>
                      <span>من</span>
                      <span className="font-semibold text-foreground">{data.total}</span>
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-muted-foreground">تم إرسال الدعوة</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{statistics.invitationsSent}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        من {statistics.total} ({statistics.total > 0 ? Math.round((statistics.invitationsSent / statistics.total) * 100) : 0}%)
                      </p>
                    </div>

                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-orange-600" />
                        <p className="text-sm text-muted-foreground">لم يتم إرسال الدعوة</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{statistics.invitationsNotSent}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        من {statistics.total} ({statistics.total > 0 ? Math.round((statistics.invitationsNotSent / statistics.total) * 100) : 0}%)
                      </p>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-muted-foreground">تم مسح QR Code</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{statistics.qrCodesScanned}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        من {statistics.hasQrCode} ({statistics.hasQrCode > 0 ? Math.round((statistics.qrCodesScanned / statistics.hasQrCode) * 100) : 0}%)
                      </p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-5 h-5 text-purple-600" />
                        <p className="text-sm text-muted-foreground">متوفر QR Code</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{statistics.hasQrCode}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        من {statistics.total} ({statistics.total > 0 ? Math.round((statistics.hasQrCode / statistics.total) * 100) : 0}%)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="بحث بالاسم، الهاتف أو المدينة..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pr-9"
                        />
                      </div>
                      <div className="relative">
                        <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-9 appearance-none cursor-pointer"
                        >
                          <option value="">جميع المدن</option>
                          {availableCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <Send className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={invitationFilter}
                          onChange={(e) => setInvitationFilter(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-9 appearance-none cursor-pointer"
                        >
                          <option value="all">جميع الدعوات</option>
                          <option value="sent">تم إرسال الدعوة</option>
                          <option value="not-sent">لم يتم إرسال الدعوة</option>
                        </select>
                      </div>
                      <div className="relative">
                        <QrCode className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={qrCodeFilter}
                          onChange={(e) => setQrCodeFilter(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-9 appearance-none cursor-pointer"
                        >
                          <option value="all">جميع QR Codes</option>
                          <option value="has">متوفر QR Code</option>
                          <option value="not-has">غير متوفر QR Code</option>
                        </select>
                      </div>
                    </div>
                    {(selectedCity || invitationFilter !== "all" || qrCodeFilter !== "all") && (
                      <div className="flex gap-2 flex-wrap">
                        {selectedCity && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCity("")}
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            إزالة فلتر المدينة
                          </Button>
                        )}
                        {invitationFilter !== "all" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvitationFilter("all")}
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            إزالة فلتر الدعوة
                          </Button>
                        )}
                        {qrCodeFilter !== "all" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQrCodeFilter("all")}
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            إزالة فلتر QR Code
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {filteredAndSortedRegistrations.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchTerm || selectedCity || invitationFilter !== "all" || qrCodeFilter !== "all"
                        ? "لا توجد نتائج للبحث"
                        : "لا توجد تسجيلات بعد"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRegistrations.size === filteredAndSortedRegistrations.length && filteredAndSortedRegistrations.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegistrations(new Set(filteredAndSortedRegistrations.map(r => r.id)))
                                } else {
                                  setSelectedRegistrations(new Set())
                                }
                              }}
                              className="w-4 h-4"
                            />
                          </th>
                          <th className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("name")}
                              className="gap-2 hover:bg-transparent"
                            >
                              الاسم
                              {sortField === "name" ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="w-4 h-4" />
                                ) : (
                                  <ArrowDown className="w-4 h-4" />
                                )
                              ) : (
                                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("phoneNumber")}
                              className="gap-2 hover:bg-transparent"
                            >
                              <Phone className="w-4 h-4" />
                              رقم الهاتف
                              {sortField === "phoneNumber" ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="w-4 h-4" />
                                ) : (
                                  <ArrowDown className="w-4 h-4" />
                                )
                              ) : (
                                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            هل تم إرسال رسالة الدعوة
                          </th>
                          <th className="px-4 py-3 text-right">
                            <MessageSquare className="w-4 h-4 inline-block text-muted-foreground" />
                            الملاحظات
                          </th>
                          <th className="px-4 py-3 text-right">
                            <QrCode className="w-4 h-4 inline-block ml-1" />
                            QR
                          </th>
                          <th className="px-4 py-3 text-right">
                            إدارة
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedRegistrations.map((registration, index) => (
                          <tr
                            key={registration.id}
                            className={`border-b border-border hover:bg-muted/30 transition-colors ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }`}
                          >
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedRegistrations.has(registration.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedRegistrations)
                                  if (e.target.checked) {
                                    newSet.add(registration.id)
                                  } else {
                                    newSet.delete(registration.id)
                                  }
                                  setSelectedRegistrations(newSet)
                                }}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-lg">{registration.name}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium dir-rtl text-right">{registration.phoneNumber}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                {registration.invitationSent ? (
                                  <>
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <span className="text-green-600 font-medium">نعم</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-400">لا</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {registration.notes ? (
                                <div className="max-w-xs">
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {registration.notes}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {registration.invitationCode ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <QrCode className="w-5 h-5 text-primary" />
                                      <span className="text-sm text-muted-foreground">متوفر</span>
                                    </div>
                                    {registration.qrCodeScanned && (
                                      <span className="text-xs text-green-600">تم المسح</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex gap-2 items-center justify-center">
                                {!registration.invitationSent && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      sendInvitationMutation.mutate([registration.id])
                                    }}
                                    disabled={sendInvitationMutation.isPending}
                                    className="gap-2 text-blue-600 border-blue-600 hover:bg-blue-600"
                                  >
                                    <Send className="w-4 h-4" />
                                    دعوة
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRegistration(registration)
                                    setEditFormData({
                                      invitationSent: registration.invitationSent || false,
                                      notes: registration.notes || "",
                                      attended: registration.attended || false,
                                    })
                                  }}
                                  className="gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  تعديل
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
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
      <AdminContent />
    </QueryClientProvider>
  )
}
