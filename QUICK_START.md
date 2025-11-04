# 🚀 دفع Schema إلى Supabase - خطوات سريعة

## 1️⃣ إعداد ملف البيئة

```bash
# أنشئ ملف .env.local
touch .env.local
```

أضف في `.env.local`:

```env
# Required: Connection string with connection pooling
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true

# Required: Direct connection for migrations (use same password, without ?pgbouncer=true)
DIRECT_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

ADMIN_PASSWORD=admin123
```

**ملاحظة مهمة:** يجب إضافة كل من `DATABASE_URL` و `DIRECT_URL` في ملف `.env.local`

**احصل على DATABASE_URL من:**
- Supabase Dashboard → Project Settings → Database → Connection string

## 2️⃣ تثبيت Prisma (إذا لم يكن مثبتاً)

```bash
npm install prisma @prisma/client
```

## 3️⃣ دفع Schema إلى قاعدة البيانات

```bash
npm run db:push
```

أو مباشرة:

```bash
npx prisma db push
```

## 4️⃣ إنشاء Prisma Client

```bash
npm run db:generate
```

أو مباشرة:

```bash
npx prisma generate
```

## ✅ تم! الآن جرب التطبيق:

```bash
npm run dev
```

---

## 📊 Indexes المضافة للأداء:

- ✅ Unique index على `phoneNumber` (منع التكرار + بحث سريع)
- ✅ Index على `city` (للبحث السريع)
- ✅ Index على `createdAt` (للترتيب السريع)
- ✅ Index على `updatedAt`
- ✅ Composite index على `city + createdAt`

## 🔒 الأمان:

- ✅ Unique constraints
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ Zod validation
- ✅ Prisma type safety

---

## 🛠️ أوامر إضافية:

```bash
# فتح Prisma Studio (GUI لإدارة البيانات)
npm run db:studio

# إنشاء migration للإنتاج
npm run db:migrate

# إعادة تعيين قاعدة البيانات (حذف جميع البيانات!)
npm run db:reset
```

