"use client"

import { useMutation } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { registrationSchema, type RegistrationFormData, iraqiCitiesList } from "@/lib/validation"
import { memo, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

async function submitRegistration(data: RegistrationFormData) {
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      // Extract error message properly
      const errorMessage = result.error || result.message || "فشل التسجيل"
      throw new Error(errorMessage)
    }

    return result
  } catch (error: any) {
    // Handle network errors or other issues
    if (error.name === "TypeError" || error.message.includes("Failed to fetch")) {
      throw new Error("فشل الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.")
    }
    throw error
  }
}

// Helper function to extract error message
function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null) {
    // Check for Zod error structure
    if ("issues" in error && Array.isArray((error as any).issues) && (error as any).issues.length > 0) {
      const issue = (error as any).issues[0]
      if (issue && typeof issue.message === "string") {
        return issue.message
      }
    }
    // Check for standard error message
    if ("message" in error && typeof error.message === "string") {
      return error.message
    }
    // Check if it's a ZodError directly
    if (error.constructor && error.constructor.name === "ZodError") {
      const zodError = error as any
      if (zodError.issues && Array.isArray(zodError.issues) && zodError.issues.length > 0) {
        return zodError.issues[0]?.message || "قيمة غير صحيحة"
      }
    }
  }
  // If it's an object, try to stringify it for debugging (but this shouldn't happen)
  if (typeof error === "object") {
    return "قيمة غير صحيحة"
  }
  return "قيمة غير صحيحة"
}

const FieldError = memo(({ error }: { error?: unknown }) => {
  // Handle case where error might be directly a string or an object
  let errorMessage: string | undefined
  
  if (!error) {
    return null
  }
  
  if (typeof error === "string") {
    errorMessage = error
  } else {
    errorMessage = getErrorMessage(error)
  }
  
  if (!errorMessage) return null
  
  return (
    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
      <AlertCircle className="w-4 h-4" />
      <span>{errorMessage}</span>
    </div>
  )
})
FieldError.displayName = "FieldError"

async function sendOTP(phoneNumber: string) {
  try {
    const response = await fetch("/api/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber }),
    })

    const result = await response.json()

    if (!response.ok) {
      const errorMessage = result.error || "فشل إرسال رمز التاكيد"
      throw new Error(errorMessage)
    }

    return result.otp // Return OTP for verification (in production, verify server-side)
  } catch (error: any) {
    if (error.name === "TypeError" || error.message.includes("Failed to fetch")) {
      throw new Error("فشل الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.")
    }
    throw error
  }
}

export function RegistrationForm() {
  const router = useRouter()

  // OTP state
  const [otpCode, setOtpCode] = useState<string>("")
  const [generatedOtp, setGeneratedOtp] = useState<string>("")
  const [showOtpInput, setShowOtpInput] = useState<boolean>(false)
  const [otpError, setOtpError] = useState<string>("")

  // Mutation for sending OTP
  const otpMutation = useMutation({
    mutationFn: ({ phoneNumber }: { phoneNumber: string }) => sendOTP(phoneNumber),
    onSuccess: (otp) => {
      setGeneratedOtp(otp)
      setShowOtpInput(true)
      setOtpError("")
    },
    onError: (error) => {
      setOtpError(error instanceof Error ? error.message : "فشل إرسال رمز التاكيد")
    },
  })

  // Mutation must be defined before form since it's used in onSubmit
  const mutation = useMutation({
    mutationFn: submitRegistration,
    onSuccess: (_, variables) => {
      // Save registration data to localStorage as backup
      if (typeof window !== "undefined") {
        localStorage.setItem("registration_name", variables.name)
        localStorage.setItem("registration_city", variables.city)
        if (variables.phoneNumber) {
          localStorage.setItem("registration_phone", variables.phoneNumber)
        }
      }
      
      // Redirect to success page with data in URL
      const params = new URLSearchParams({
        name: variables.name,
        city: variables.city,
      })
      if (variables.phoneNumber) {
        params.append("phone", variables.phoneNumber)
      }
      
      router.push(`/success?${params.toString()}`)
    },
    onError: (error) => {
      // Handle error silently
    },
  })
  
  const form = (useForm as any)({
    defaultValues: {
      name: "",
      phoneNumber: "",
      city: "" as any,
      message: "",
    } as RegistrationFormData,
    defaultMeta: {
      isTouched: false,
    },
    onSubmit: async ({ value }: { value: RegistrationFormData }) => {
      mutation.mutate(value)
    },
  })

  // Track form field values in local state for reactive button updates
  const [fieldValues, setFieldValues] = useState({
    name: "",
    phoneNumber: "",
    city: "",
  })

  const [fieldErrors, setFieldErrors] = useState({
    name: false,
    phoneNumber: false,
    city: false,
  })

  // Update validity check function
  const updateFormValidity = useCallback(() => {
    try {
      const values = form.state.values || {}
      const fieldMeta = form.state.fieldMeta || {}

      console.log("[Form Validity] Values:", values)
      console.log("[Form Validity] Field Meta Errors:", {
        name: fieldMeta.name?.errors,
        phoneNumber: fieldMeta.phoneNumber?.errors,
        city: fieldMeta.city?.errors,
      })
      // Log detailed error messages
      if (fieldMeta.name?.errors && fieldMeta.name.errors.length > 0) {
        console.log("[Form Validity] Name Error Details:", fieldMeta.name.errors[0])
      }
      if (fieldMeta.phoneNumber?.errors && fieldMeta.phoneNumber.errors.length > 0) {
        console.log("[Form Validity] Phone Error Details:", fieldMeta.phoneNumber.errors[0])
      }
      if (fieldMeta.city?.errors && fieldMeta.city.errors.length > 0) {
        console.log("[Form Validity] City Error Details:", fieldMeta.city.errors[0])
      }

      const newFieldValues = {
        name: values.name || "",
        phoneNumber: values.phoneNumber || "",
        city: values.city || "",
      }

      // Check errors from fieldMeta.errors (not errorsMap)
      const newFieldErrors = {
        name: !!(fieldMeta.name?.errors && fieldMeta.name.errors.length > 0),
        phoneNumber: !!(fieldMeta.phoneNumber?.errors && fieldMeta.phoneNumber.errors.length > 0),
        city: !!(fieldMeta.city?.errors && fieldMeta.city.errors.length > 0),
      }

      const isFormValid = !newFieldErrors.name && 
                         !newFieldErrors.phoneNumber && 
                         !newFieldErrors.city && 
                         newFieldValues.name.trim() && 
                         newFieldValues.phoneNumber.trim() && 
                         newFieldValues.city

      console.log("[Form Validity] New field values:", newFieldValues)
      console.log("[Form Validity] New field errors:", newFieldErrors)
      console.log("[Form Validity] Is form valid?", isFormValid)

      setFieldValues(newFieldValues)
      setFieldErrors(newFieldErrors)
    } catch (error) {
      console.log("[Form Validity] Error:", error)
      // Silently fail if form state is not ready yet
    }
  }, [form])

  // Calculate if form is valid
  // Check both field values and errors
  const isFormValid = !!(
    fieldValues.name.trim() &&
    fieldValues.phoneNumber.trim() &&
    fieldValues.city &&
    !fieldErrors.name &&
    !fieldErrors.phoneNumber &&
    !fieldErrors.city
  )

  // Initial validity check and update on form state changes
  useEffect(() => {
    // Only run if form is initialized
    if (!form || !form.state) {
      return
    }

    // Small delay to ensure form state is ready
    const timeoutId = setTimeout(() => {
      updateFormValidity()
    }, 0)
    
    // Poll form state every 200ms to ensure button updates reactively
    // This is a fallback mechanism to ensure button state stays in sync
    const checkInterval = setInterval(() => {
      if (form && form.state) {
        updateFormValidity()
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(checkInterval)
    }
  }, [form, updateFormValidity])

  return (
    <>
      {mutation.isSuccess ? (
        <Card className="border-2 border-green-500/20">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-2xl font-bold mb-2">جاري التحويل...</h3>
            <p className="text-muted-foreground">
              يتم توجيهك إلى صفحة التأكيد
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl"></CardTitle>
            <CardDescription>
              
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                // If OTP input is shown, verify OTP and submit registration
                if (showOtpInput) {
                  // Verify OTP
                  if (otpCode.trim() !== generatedOtp) {
                    setOtpError("رمز التاكيد غير صحيح. يرجى المحاولة مرة أخرى.")
                    return
                  }
                  
                  // OTP is correct, proceed with registration
                  setOtpError("")
                  updateFormValidity()
                  await form.validateAllFields("submit")
                  updateFormValidity()
                  const hasErrors = form.state.fieldMeta.name?.errors?.length > 0 ||
                                    form.state.fieldMeta.phoneNumber?.errors?.length > 0 ||
                                    form.state.fieldMeta.city?.errors?.length > 0
                  if (!hasErrors && form.state.values.name && form.state.values.phoneNumber && form.state.values.city) {
                    form.handleSubmit()
                  }
                  return
                }
                
                // If OTP input is not shown, validate form and send OTP
                updateFormValidity()
                await form.validateAllFields("submit")
                updateFormValidity()
                // Check if form is valid by checking individual field errors
                const hasErrors = form.state.fieldMeta.name?.errors?.length > 0 ||
                                  form.state.fieldMeta.phoneNumber?.errors?.length > 0 ||
                                  form.state.fieldMeta.city?.errors?.length > 0
                if (!hasErrors && form.state.values.name && form.state.values.phoneNumber && form.state.values.city) {
                  // Form is valid, send OTP
                  otpMutation.mutate({ phoneNumber: form.state.values.phoneNumber })
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
              <form.Field
                name="name"
                validators={{
                  onBlur: (value: any) => {
                    // Only validate on blur (when user leaves the field)
                    let stringValue: string
                    if (typeof value === "string") {
                      stringValue = value
                    } else if (value && typeof value === "object") {
                      stringValue = (value.value || value.toString() || "").trim()
                    } else {
                      stringValue = String(value || "")
                    }
                    console.log("[Name Validation] Raw value:", value, "Type:", typeof value)
                    console.log("[Name Validation] Processed value:", stringValue, "Trimmed:", stringValue.trim())
                    if (!stringValue || stringValue.trim() === "") {
                      console.log("[Name Validation] Empty value")
                      return "الاسم مطلوب"
                    }
                    const result = registrationSchema.shape.name.safeParse(stringValue)
                    console.log("[Name Validation] Result:", result.success)
                    if (!result.success) {
                      console.log("[Name Validation] Errors:", result.error.issues)
                      return result.error.issues[0]?.message || "قيمة غير صحيحة"
                    }
                    console.log("[Name Validation] Valid name")
                    return undefined
                  },
                }}
              >
                  {(field: any) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}></Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          const newValue = e.target.value
                          field.handleChange(newValue)
                          // Clear errors when user starts typing again
                          if (field.state.meta.errors.length > 0) {
                            console.log("[Name Input] Clearing errors, new value:", newValue)
                            field.setMeta((prev: any) => ({
                              ...prev,
                              errors: [],
                            }))
                          }
                          // Update form validity immediately
                          setTimeout(() => {
                            updateFormValidity()
                          }, 0)
                        }}
                        placeholder="أدخل اسمك الكامل"
                        className={
                          field.state.meta.errors.length > 0
                            ? "border-destructive"
                            : ""
                        }
                      />
                      <FieldError error={field.state.meta.errors[0]} />
                    </div>
                  )}
                </form.Field>

                {/* Phone Number Field */}
                <form.Field
                  name="phoneNumber"
                  validators={{
                    onBlur: (value: any) => {
                      // Only validate on blur (when user leaves the field)
                      // Handle case where value might be an object (like city)
                      let stringValue: string
                      if (typeof value === "string") {
                        stringValue = value
                      } else if (value && typeof value === "object") {
                        // If it's an object, try to extract the actual value
                        stringValue = (value.value || value.toString() || "").trim()
                      } else {
                        stringValue = String(value || "")
                      }
                      console.log("[Phone Validation] Raw value:", value, "Type:", typeof value)
                      console.log("[Phone Validation] Processed value:", stringValue, "Length:", stringValue.length)
                      if (!stringValue || stringValue.trim() === "") {
                        console.log("[Phone Validation] Empty value")
                        return "رقم الهاتف مطلوب"
                      }
                      const result = registrationSchema.shape.phoneNumber.safeParse(stringValue)
                      console.log("[Phone Validation] Result:", result.success)
                      if (!result.success) {
                        console.log("[Phone Validation] Errors:", result.error.issues)
                        return result.error.issues[0]?.message || "قيمة غير صحيحة"
                      }
                      console.log("[Phone Validation] Valid phone")
                      return undefined
                    },
                  }}
                >
                  {(field: any) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        
                       
                      </Label>
                      <div className="relative">
                        
                        <Input
                          id={field.name}
                          name={field.name}
                          type="tel"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          className={field.state.meta.errors.length > 0 ? "border-destructive " : "pr-3"}
                          dir="rtl"
                        onChange={(e) => {
                          let value = e.target.value
                          // Remove spaces and dashes for cleaner input
                          value = value.replace(/[\s\-]/g, "")
                          
                          // Clear errors when user starts typing again
                          if (field.state.meta.errors.length > 0) {
                            field.setMeta((prev: any) => ({
                              ...prev,
                              errors: [],
                            }))
                          }
                          
                          // Allow +964 at the start or 07
                          if (value.startsWith("+964")) {
                            // Allow up to 14 chars: +9647XXXXXXXXX (11 digits after +964)
                            const digitsAfter = value.slice(4).replace(/\D/g, "")
                            if (digitsAfter.length <= 11) {
                              field.handleChange("+964" + digitsAfter)
                            }
                          } else if (value.startsWith("+")) {
                            // Remove + if not followed by 964
                            field.handleChange(value.replace(/[^\d]/g, ""))
                          } else if (value.startsWith("964")) {
                            // Allow 9647XXXXXXXXX format (11 digits after 964)
                            const digitsAfter = value.slice(3).replace(/\D/g, "")
                            if (digitsAfter.length <= 11) {
                              field.handleChange("964" + digitsAfter)
                            }
                          } else if (value.startsWith("0")) {
                            // Local format 07XXXXXXXXX (11 digits total)
                            const digits = value.replace(/\D/g, "")
                            if (digits.length <= 11) {
                              field.handleChange(digits)
                            }
                          } else {
                            // Start with 0 if just digits
                            const digits = value.replace(/\D/g, "")
                            if (digits.length <= 11) {
                              field.handleChange("0" + digits)
                            }
                          }
                          // Update form validity
                          setTimeout(() => {
                            updateFormValidity()
                          }, 0)
                        }}
                        placeholder="رقم الهاتف (واتساب)"
                        maxLength={15}
                      />
                      </div>
                      <FieldError error={field.state.meta.errors[0]} />
                    </div>
                  )}
                </form.Field>

                {/* City Field */}
                <form.Field
                  name="city"
                  validators={{
                    onBlur: (value: any) => {
                      // Only validate on blur (when user leaves the field)
                      // Handle case where value might be an object
                      let stringValue: string
                      if (typeof value === "string") {
                        stringValue = value.trim()
                      } else if (value && typeof value === "object") {
                        // If it's an object, try to extract the actual value
                        stringValue = (value.value || value.toString() || "").trim()
                      } else {
                        stringValue = String(value || "").trim()
                      }
                      console.log("[City Validation] Raw value:", value, "Type:", typeof value)
                      console.log("[City Validation] Processed value:", stringValue, "Length:", stringValue.length)
                      if (!stringValue || stringValue === "") {
                        console.log("[City Validation] Empty value")
                        return "يرجى اختيار مدينة صحيحة من القائمة"
                      }
                      const result = registrationSchema.shape.city.safeParse(stringValue)
                      console.log("[City Validation] Result:", result.success)
                      if (!result.success) {
                        console.log("[City Validation] Errors:", result.error.issues)
                        return result.error.issues[0]?.message || "يرجى اختيار مدينة صحيحة من القائمة"
                      }
                      console.log("[City Validation] Valid city")
                      return undefined
                    },
                  }}
                >
                  {(field: any) => (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={field.name}>المدينة *</Label>
                      <select
                        id={field.name}
                        name={field.name}
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          const selectedValue = e.target.value
                          console.log("[City Select] Changed to:", selectedValue, "Type:", typeof selectedValue)
                          field.handleChange(selectedValue as any)
                          console.log("[City Select] Field state value after change:", field.state.value)
                          // Clear errors when user selects a city
                          if (field.state.meta.errors.length > 0) {
                            field.setMeta((prev: any) => ({
                              ...prev,
                              errors: [],
                            }))
                          }
                          // Update form validity
                          setTimeout(() => {
                            updateFormValidity()
                          }, 0)
                        }}
                        className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          field.state.meta.errors.length > 0
                            ? "border-destructive"
                            : "border-input bg-background"
                        }`}
                      >
                        <option value="">اختر المدينة</option>
                        {iraqiCitiesList.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <FieldError error={field.state.meta.errors[0]} />
                    </div>
                  )}
                </form.Field>
              </div>

              {/* OTP Input - shown after clicking "سجل الآن" */}
              {showOtpInput && (
                <div className="space-y-2">
                  <Label htmlFor="otp">رمز التاكيد *</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      value={otpCode}
                      onChange={(e) => {
                        // Only allow 6 digits
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                        setOtpCode(value)
                        setOtpError("")
                      }}
                      placeholder="أدخل رمز التاكيد (6 أرقام)"
                      className={`flex-1 ${otpError ? "border-destructive" : ""}`}
                      dir="ltr"
                      maxLength={6}
                    />
                  </div>
                  {otpError && (
                    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{otpError}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    تم إرسال رمز التاكيد إلى رقم الواتساب الخاص بك
                  </p>
                </div>
              )}

              {/* OTP Sending Error */}
              {otpMutation.isError && !showOtpInput && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {otpMutation.error instanceof Error
                      ? otpMutation.error.message
                      : "فشل إرسال رمز التاكيد. يرجى المحاولة مرة أخرى."}
                  </span>
                </div>
              )}

              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={mutation.isPending || otpMutation.isPending || (!showOtpInput && !isFormValid) || (showOtpInput && !otpCode.trim())}
                >
                  {mutation.isPending 
                    ? "جاري التسجيل..." 
                    : otpMutation.isPending 
                    ? "جاري إرسال رمز التاكيد..."
                    : showOtpInput 
                    ? "تأكيد والتسجيل" 
                    : "سجل الآن"}
                </Button>
                
                {showOtpInput && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => {
                      // Resend OTP
                      if (form.state.values.phoneNumber) {
                        otpMutation.mutate({ phoneNumber: form.state.values.phoneNumber })
                        setOtpCode("")
                        setOtpError("")
                      }
                    }}
                    disabled={otpMutation.isPending}
                  >
                    إعادة إرسال الرمز
                  </Button>
                )}
              </div>

              {mutation.isError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "حدث خطأ. يرجى المحاولة مرة أخرى."}
                  </span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}
