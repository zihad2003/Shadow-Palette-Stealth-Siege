# ডিপ্লয়মেন্ট গাইড (বাংলা)

এই গাইডে Shadow Palette প্রজেক্ট প্রোডাকশনে ডিপ্লয় করার উপায় বাংলায় দেওয়া হলো।

## প্রয়োজনীয় জিনিসপত্র

- GitHub রিপোজিটরি
- Render অ্যাকাউন্ট (ফ্রি প্ল্যান আছে)
- Vercel অ্যাকাউন্ট (ফ্রি প্ল্যান আছে)

## Backend ডিপ্লয় (Render)

### ১. Render-এ MySQL ডাটাবেস তৈরি করুন

1. [Render Dashboard](https://dashboard.render.com/) এ যান
2. "New" → "Database" ক্লিক করুন
3. "MySQL" বেছে নিন
4. Database name: `shadow_palette`
5. User: `shadow_palette_user`
6. Region: আপনার কাছাকাছি রিজিন বেছে নিন
7. "Create Database" ক্লিক করুন

### ২. Backend সার্ভিস ডিপ্লয় করুন

1. [Render Dashboard](https://dashboard.render.com/) এ যান
2. "New" → "Web Service" ক্লিক করুন
3. আপনার GitHub রিপোজিটরি কানেক্ট করুন
4. কনফিগার করুন:
   - **Name**: `shadow-palette-backend`
   - **Runtime**: Docker
   - **Dockerfile path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
   - **Branch**: `main` (বা আপনার ডিপ্লয়মেন্ট ব্রাঞ্চ)
5. Environment Variables যোগ করুন:
   - `SPRING_DATASOURCE_URL`: আপনার Render ডাটাবেস থেকে নিন
   - `SPRING_DATASOURCE_USERNAME`: আপনার Render ডাটাবেস থেকে নিন
   - `SPRING_DATASOURCE_PASSWORD`: আপনার Render ডাটাবেস থেকে নিন
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `PORT`: `8080`
6. "Deploy Web Service" ক্লিক করুন

### ৩. Backend URL সংগ্রহ করুন

ডিপ্লয়মেন্টের পর Render আপনাকে একটি URL দেবে:
```
https://shadow-palette-backend.onrender.com
```

এই URL সেভ রাখুন frontend কনফিগারেশনের জন্য।

## Frontend ডিপ্লয় (Vercel)

### ১. Vercel-এ কানেক্ট করুন

1. [Vercel Dashboard](https://vercel.com/dashboard) এ যান
2. "Add New Project" ক্লিক করুন
3. আপনার GitHub রিপোজিটরি ইমপোর্ট করুন

### ২. প্রজেক্ট কনফিগার করুন

1. **Framework Preset**: Vite
2. **Root Directory**: খালি রাখুন (বা `frontend` সেট করুন)
3. **Build Command**: `npm run build --prefix frontend`
4. **Output Directory**: `frontend/dist`

### ৩. Environment Variables যোগ করুন

নিচের environment variable যোগ করুন:
- `VITE_API_BASE_URL`: আপনার Render backend URL (যেমন `https://shadow-palette-backend.onrender.com`)

### ৪. ডিপ্লয় করুন

"Deploy" ক্লিক করুন এবং বিল্ড শেষ হওয়া পর্যন্ত অপেক্ষা করুন।

## ডিপ্লয়মেন্টের পর

### ১. Backend CORS আপডেট করুন

আপনার backend এ Vercel ডোমেইন থেকে রিকোয়েস্ট নিতে CORS কনফিগারেশন লাগতে পারে।

### ২. ডিপ্লয়মেন্ট টেস্ট করুন

1. আপনার Vercel URL ভিজিট করুন
2. ইউজার রেজিস্ট্রেশন/লগিন টেস্ট করুন
3. গেমপ্লে ফিচার টেস্ট করুন
4. WebSocket কানেকশন চেক করুন

### ৩. লগ মনিটর করুন

- **Render**: Render Dashboard এ সার্ভিস লগ চেক করুন
- **Vercel**: Vercel Dashboard এ ডিপ্লয়মেন্ট লগ চেক করুন

## সমস্যা সমাধান

### Backend সমস্যা

- **ডাটাবেস কানেকশন**: MySQL credentials চেক করুন
- **পোর্ট সমস্যা**: PORT 8080 সেট করুন
- **বিল্ড ফেইল**: Docker build লগ চেক করুন

### Frontend সমস্যা

- **API কানেকশন**: VITE_API_BASE_URL সঠিকভাবে সেট করুন
- **WebSocket সমস্যা**: Backend WebSocket সাপোর্ট করে কিনা চেক করুন
- **বিল্ড ফেইল**: Vercel build লগ চেক করুন

## খরচ

- **Render ফ্রি টিয়ার**: সীমিত রিসোর্স, নিষ্ক্রিয় থাকলে স্লিপ হতে পারে
- **Vercel ফ্রি টিয়ার**: হবি প্রজেক্টের জন্য ভালো লিমিট
- **ডাটাবেস**: Render ফ্রি MySQL এ সীমিত কানেকশন

প্রোডাকশনের জন্য পেইড প্ল্যান বিবেচনা করুন।
