# تطبيق تسجيل الفنانين في الحدث

تطبيق Next.js سريع جداً لتسجيل الفنانين في حدث مجاني مع عداد تنازلي ولوحة إدارة، يستخدم Prisma مع Supabase PostgreSQL.

## المميزات

- ⚡ **سريع جداً** - مع TanStack Form والتحقق الفوري
- ⏰ عداد تنازلي للحدث
- 📝 نموذج تسجيل محسّن مع التحقق الكامل
- 🔒 أمان متقدم (Rate Limiting, Input Sanitization, Validation)
- 👨‍💼 لوحة إدارة متقدمة مع بحث وتصدير
- 📱 تصميم متجاوب
- 🎨 ألوان بسيطة وإبداعية
- 🗄️ Prisma ORM مع Supabase PostgreSQL للسرعة والموثوقية
- 🏙️ دعم مدن العراق بالعربية

## التقنيات المستخدمة

- Next.js 14 (App Router)
- React TanStack Query
- React TanStack Form
- Prisma ORM
- Supabase PostgreSQL
- Shadcn UI
- TypeScript
- Tailwind CSS
- Zod للتحقق

## الإعداد

### 1. تثبيت الحزم

```bash
npm install
```

### 2. إعداد Supabase

1. أنشئ مشروع جديد على [Supabase](https://supabase.com)
2. انتقل إلى Project Settings > Database
3. ابحث عن "Connection string" وانسخها
4. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات
5. استبدل `[YOUR-PROJECT-REF]` بمعرف المشروع

### 3. إعداد Prisma

1. أنشئ ملف `.env.local`:

```bash
cp .env.example .env.local
```

2. أضف DATABASE_URL و DIRECT_URL من Supabase:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
ADMIN_PASSWORD=admin123
```

3. ادفع Schema إلى قاعدة البيانات:

```bash
npm run db:push
```

4. أنشئ Prisma Client:

```bash
npm run db:generate
```

### 4. تشغيل المشروع

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## الصفحات

- **الصفحة الرئيسية** (`/`): صفحة التسجيل مع العداد التنازلي
- **لوحة الإدارة** (`/admin`): عرض جميع التسجيلات مع بحث وتصدير (كلمة المرور الافتراضية: `admin123`)

## هيكل قاعدة البيانات

### جدول التسجيلات (registrations)
- `id` - UUID (Primary Key)
- `name` - String (الاسم)
- `phoneNumber` - String (رقم الهاتف - Unique)
- `city` - String (المدينة)
- `message` - String? (الرسالة - اختياري)
- `createdAt` - DateTime
- `updatedAt` - DateTime

### جدول الإدارة (admins)
- `id` - UUID (Primary Key)
- `username` - String (Unique)
- `password` - String (Hashed)
- `email` - String? (Unique, اختياري)
- `isActive` - Boolean
- `createdAt` - DateTime
- `updatedAt` - DateTime

## حقول النموذج

- **الاسم**: مطلوب، 2-100 حرف
- **رقم الهاتف**: مطلوب، رقم عراقي (07XXXXXXXXX)
- **المدينة**: مطلوب، اختيار من قائمة مدن العراق
- **الرسالة**: اختياري، حتى 1000 حرف

## الأمان

- ✅ Rate Limiting (5 طلبات كل 15 دقيقة لكل IP)
- ✅ Input Sanitization (تنظيف المدخلات من XSS)
- ✅ Zod Validation (تحقق شامل من البيانات)
- ✅ Duplicate Phone Check (منع التسجيل المكرر)
- ✅ Database Constraints (قيود على مستوى قاعدة البيانات)
- ✅ Password Protection للوحة الإدارة

## الأداء

- ⚡ Form Validation فوري مع TanStack Form
- ⚡ Memoized Components لتقليل إعادة التصيير
- ⚡ Optimistic Updates مع React Query
- ⚡ Database Indexing للاستعلامات السريعة
- ⚡ Server-side Validation للأمان الإضافي
- ⚡ Prisma Connection Pooling

## أوامر Prisma

```bash
# دفع Schema إلى قاعدة البيانات
npm run db:push

# فتح Prisma Studio (GUI لإدارة البيانات)
npm run db:studio

# إنشاء Prisma Client
npm run db:generate
```

## كلمة مرور الإدارة

الكلمة الافتراضية: `admin123`

يمكنك تغييرها عبر متغير البيئة `ADMIN_PASSWORD`.

## التطوير

```bash
# التطوير
npm run dev

# البناء للإنتاج
npm run build

# التشغيل بعد البناء
npm start

# فحص الأخطاء
npm run lint
```

## ملاحظات

- تأكد من تحديث `DATABASE_URL` و `DIRECT_URL` في `.env.local`
- في الإنتاج، استخدم `.env` بدلاً من `.env.local`
- كلمة مرور الإدارة يجب تغييرها في الإنتاج
