"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Users, Lock, Download, Search, Mail, AlertCircle, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Phone, MapPin, MessageSquare } from "lucide-react"
import { iraqiCitiesList } from "@/lib/validation"
import { formatDateTime } from "@/lib/date-utils"

interface Registration {
  id: string
  name: string
  phoneNumber: string
  city: string
  message: string
  createdAt: string
}

type SortField = "name" | "city" | "createdAt" | "phoneNumber"
type SortDirection = "asc" | "desc" | null

const AUTH_KEY = "admin_authenticated"
const AUTH_EMAIL_KEY = "admin_email"

function AdminContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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
  }, [data?.registrations, searchTerm, selectedCity, sortField, sortDirection])

  // Get unique cities from registrations for filter dropdown
  const availableCities = useMemo(() => {
    if (!data?.registrations) return []
    const cities = new Set(data.registrations.map((r) => r.city))
    return Array.from(cities).sort()
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

              <div className="text-xs text-muted-foreground text-center pt-2">
                <p>بيانات الدخول الافتراضية:</p>
                <p>Email: admin@event.com</p>
                <p>Password: admin123</p>
              </div>
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
                    {selectedCity && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCity("")}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        إزالة الفلتر
                      </Button>
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
                      {searchTerm || selectedCity
                        ? "لا توجد نتائج للبحث"
                        : "لا توجد تسجيلات بعد"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("city")}
                              className="gap-2 hover:bg-transparent"
                            >
                              <MapPin className="w-4 h-4" />
                              المدينة
                              {sortField === "city" ? (
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
                              onClick={() => handleSort("createdAt")}
                              className="gap-2 hover:bg-transparent"
                            >
                              <Calendar className="w-4 h-4" />
                              تاريخ التسجيل
                              {sortField === "createdAt" ? (
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
                            <MessageSquare className="w-4 h-4 inline-block text-muted-foreground" />
                            الرسالة
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
                            <td className="px-4 py-4">
                              <div className="font-semibold text-lg">{registration.name}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium dir-ltr text-left">{registration.phoneNumber}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-medium">{registration.city}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm">
                                {formatDateTime(new Date(registration.createdAt))}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {registration.message ? (
                                <div className="max-w-xs">
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {registration.message}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
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
