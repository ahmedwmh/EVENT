# إعداد Prisma و Supabase

## الخطوات المطلوبة:

### 1. تثبيت Prisma (إذا لم يكن مثبتاً)

```bash
npm install prisma @prisma/client
```

### 2. إعداد ملف `.env.local`

أنشئ ملف `.env.local` في المجلد الرئيسي وأضف:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
ADMIN_PASSWORD=admin123
```

**كيفية الحصول على DATABASE_URL:**
1. اذهب إلى Supabase Dashboard
2. Project Settings > Database
3. ابحث عن "Connection string" 
4. اختر "Transaction" أو "Session" mode
5. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات
6. استبدل `[YOUR-PROJECT-REF]` بمعرف المشروع

### 3. دفع Schema إلى قاعدة البيانات

```bash
npm run db:push
```

أو مباشرة:

```bash
npx prisma db push
```

### 4. إنشاء Prisma Client

```bash
npm run db:generate
```

أو مباشرة:

```bash
npx prisma generate
```

### 5. التحقق من Schema (اختياري)

افتح Prisma Studio لرؤية البيانات:

```bash
npm run db:studio
```

## Indexes المضافة للأداء:

✅ **registrations table:**
- Unique index على `phoneNumber` (منع التكرار + بحث سريع)
- Index على `city` (للبحث السريع)
- Index على `createdAt` (للترتيب السريع)
- Index على `updatedAt`
- Composite index على `city + createdAt` (للاستعلامات المركبة)

✅ **admins table:**
- Unique index على `username`
- Unique index على `email`
- Index على `isActive`
- Index على `createdAt`

## الأمان:

✅ Unique constraints لمنع البيانات المكررة
✅ Proper indexes للاستعلامات السريعة
✅ Type-safe Prisma queries

## ملاحظات:

- تأكد من وجود DATABASE_URL و DIRECT_URL صحيحين
- استخدم `db:push` للتطوير و `db:migrate` للإنتاج
- Prisma Client سيتم إنشاؤه تلقائياً عند البناء (`npm run build`)

