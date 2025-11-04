"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { CountdownTimer } from "@/components/CountdownTimer"
import { RegistrationForm } from "@/components/RegistrationForm"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { formatEventDate, getEventDate } from "@/lib/date-utils"
import { Users, Calendar, Music } from "lucide-react"

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  const [showForm, setShowForm] = useState(false)
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [eventDateString, setEventDateString] = useState("")

  useEffect(() => {
    const date = getEventDate()
    setEventDate(date)
    setEventDateString(formatEventDate(date))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
        <div className="container mx-auto px-4  md:py-16 flex-1">
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
            {!showForm ? (
              <>
                {/* Landing Page */}
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-20">
                  {/* Logo */}
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center">
                      {/* <div className="bg-primary/10 rounded-full p-8 md:p-12">
                        <Users className="w-16 h-16 md:w-24 md:h-24 text-primary" />
                      </div> */}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      مهرجان الاستثمار 
                      <p className="text-[26px] text-white">للأعمار والتنمية</p>
                    </h1>
                    

                  
                    
                  </div>

                  
                  
                  <div className="flex flex-col justify-center items-center ">
                  <p className="text-2xl text-muted-foreground">2025-11-15</p>
                  <hr className="w-full border-t border-border/50 my-8" />
                      {/* Register Button */}
                  <Button
                    onClick={() => setShowForm(true)}
                    size="lg"
                    className="animated-button w-full text-lg font-bold px-8 py-4 h-auto shadow-lg shadow-[#333333] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-primary/20"
                  >
                    الحصول على التذكرة الان
                  </Button>
                  <p className="text-[14px] mt-2">التذاكر مجانية (المقاعد محدودة)</p>

                
                  {/* 4 Logos Placeholders */}

                  <div className="flex items-center flex-col justify-center gap-6 md:gap-8 mt-14">

                    <img width={100}  className="object-cover" src="./images/0.png" alt="" />
                  
                  <div className="flex items-center justify-center gap-6 md:gap-8 mt-10">
                      <div className="bg-muted/50 rounded-lg p-4 md:p-6 border border-border/50">
                          <img width={80}  className="object-cover" src="./images/1_.svg" alt="" />
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 md:p-6 border border-border/50">
                        <img width={80}  className="object-cover" src="./images/3-.svg" alt="" />
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 md:p-6 border border-border/50">
                        <img width={80}  className="object-cover" src="./images/4-.svg" alt="" />
                      </div>
                  </div>

                  </div>
                  </div>

                </div>
              </>
            ) : (
              <>
                {/* Form Page */}
                <div className="text-center space-y-4 mb-8">
                  <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    تجمع الفنانين
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground">
                    انضم إلى أكبر تجمع للفنانين من جميع أنحاء المنطقة
                  </p>
                  {eventDateString && (
                    <p className="text-base md:text-lg font-semibold text-primary">
                      حدث مجاني • {eventDateString}
                    </p>
                  )}
                </div>

                {/* Countdown Timer */}
                {eventDate && <CountdownTimer targetDate={eventDate} />}

                {/* Registration Form */}
                <RegistrationForm />

                {/* Back Button */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    العودة للصفحة الرئيسية
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Footer - Fixed at bottom */}
        <footer className="w-full border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center space-y-2 text-sm text-muted-foreground">

              <p>2025 جميع الحقوق محفوظة © . شركة الروابي الحديثة</p>

              <p className="text-xs">
              <span className="font-semibold text-[16px] text-[#93C851]" >مصدر  </span>
                Powered by{" "}
                
            </p>
             
            </div>
          </div>
        </footer>
      </main>
    </QueryClientProvider>
  )
}

