# إعداد Supabase - حل مشاكل الصلاحيات (Permission Errors)

## المشكلة الشائعة: خطأ 403 - Permission Error

إذا ظهرت رسالة `permission error` أو `403`, فهذا يعني أن إعدادات قاعدة البيانات أو RLS policies غير صحيحة.

## الحلول:

### 1. التحقق من DATABASE_URL

تأكد من أن `DATABASE_URL` في `.env.local` يحتوي على **Service Role Key** وليس **Anon Key**.

**❌ خطأ (Anon Key - سيسبب 403):**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres?pgbouncer=true&apikey=[ANON_KEY]
```

**✅ صحيح (Service Role Key أو بدون apikey):**
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT].supabase.co:5432/postgres
```

### 2. إعداد RLS Policies في Supabase

اذهب إلى Supabase Dashboard → SQL Editor وأعد تشغيل:

```sql
-- تعطيل RLS للجدول registrations (للتطوير فقط)
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;

-- أو إضافة policy للسماح بالكتابة للجميع
DROP POLICY IF EXISTS "Allow public registration" ON registrations;
CREATE POLICY "Allow public registration"
  ON registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

### 3. التحقق من Connection String

1. اذهب إلى **Supabase Dashboard**
2. **Project Settings** → **Database**
3. ابحث عن **Connection string** → **URI**
4. اختر **Session** أو **Transaction** mode (ليس Pooler)
5. انسخ الرابط واستبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات

### 4. إعادة إعداد Prisma

```bash
# حذف Prisma Client القديم
rm -rf node_modules/.prisma

# إعادة توليد Prisma Client
npm run db:generate

# دفع Schema مرة أخرى
npm run db:push
```

### 5. التحقق من إعدادات Supabase

تأكد من:
- ✅ قاعدة البيانات تعمل (Status: Healthy)
- ✅ Password صحيحة
- ✅ Project URL صحيح
- ✅ لا توجد network restrictions

### 6. استخدام Supabase Client بدلاً من Prisma (حل بديل)

إذا استمرت المشكلة، يمكنك استخدام Supabase Client مباشرة بدلاً من Prisma للتطوير.

## نصائح:

- في **التطوير**: يمكن تعطيل RLS مؤقتاً
- في **الإنتاج**: استخدم RLS policies بشكل صحيح مع Service Role Key
- **لا تشارك** Service Role Key أو Database Password في الكود العام

## اختبار الاتصال:

```bash
# اختبار الاتصال بقاعدة البيانات
npx prisma db execute --stdin <<< "SELECT 1"
```

إذا نجح الأمر، يعني الاتصال يعمل بشكل صحيح.

