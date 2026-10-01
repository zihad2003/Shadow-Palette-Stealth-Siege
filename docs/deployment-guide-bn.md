# ডিপ্লয়মেন্ট গাইড

লাইভ গেমের স্ক্রিন Vercel-এ, সার্ভার Render-এ। দুইজন আলাদা নেটওয়ার্কে Co-op / Duo করতে পারবে। কথা বলাও সেই সার্ভারের ওয়েবসকেটে যায়। আলাদা TURN সার্ভার লাগে না।

## যা ঠিক থাকতে হবে

1. Render চালু আছে। `GET /api/health` দিলে `{"status":"ok"}` আসে।
2. সার্ভিস `local` প্রোফাইলে আছে, অথবা এমন MySQL আছে যার ঠিকানা এখনো খোলে।
3. Vercel বিল্ডে `VITE_API_BASE_URL` সেই Render `https` ঠিকানা, শেষে `/` ছাড়া।

রেইড স্ক্রিনে `Player 0null` এবং খালি টার্গেট মানে ব্রাউজার অ্যাকাউন্ট পায়নি। API ঠিকানা খালি, অথবা ব্যাকএন্ড বন্ধ।

## Backend (Render)

`render.yaml` ব্লুপ্রিন্ট: Docker, কনটেক্সট `./backend`, `SPRING_PROFILES_ACTIVE=local`, `PORT=8080`, হেলথ চেক `/api/health`।

1. নতুন **Web Service**। এই GitHub রিপো, ব্রাঞ্চ `main`।
2. Runtime **Docker**। Dockerfile `./backend/Dockerfile`। Context `./backend`।
3. Environment:
   - `SPRING_PROFILES_ACTIVE` = `local`
   - `PORT` = `8080`
   - `FLYWAY_ENABLED` = `false`
4. `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DRIVER` মুছে দিন, যদি না আজকে সেই ডাটাবেসের ঠিকানা সত্যিই খোলে।
5. `ALLOWED_ORIGINS` খালি রাখুন। খালি থাকলে Vercel ডোমেইন ঢুকতে পারে।
6. ডিপ্লয় করুন। `https://<your-service>.onrender.com/api/health` খুলুন।

`backend/docker-entrypoint.sh` সেফটি নেট। `SPRING_DATASOURCE_URL`-এর হোস্ট যদি DNS-এ না মেলে, কন্টেইনার H2-তে উঠবে, Flyway-তে ক্র্যাশ করবে না। যে হোস্ট নাম মেলে কিন্তু কানেকশন নেয় না, সেটা এই স্ক্রিপ্ট ধরে না। সেই URL মুছে দিন।

### ফ্রি প্ল্যান

H2 ফাইল কন্টেইনারের ভিতরে থাকে। ফ্রি সার্ভিস ঘুমালে বা নতুন ডিপ্লয় হলে ডিস্ক মুছে যায়। বট বেস আবার তৈরি হয়। প্লেয়ারের সেভ থাকে না।

সেভ রাখতে হলে এমন MySQL দিন যার হোস্ট Render-এর ভিতর থেকে খোলে। `SPRING_DATASOURCE_URL`, ইউজার, পাসওয়ার্ড, এবং `SPRING_DATASOURCE_DRIVER=com.mysql.cj.jdbc.Driver` সেট করুন। সেই বুটে `SPRING_PROFILES_ACTIVE=local` রাখবেন না।

## Frontend (Vercel)

1. রিপো ইমপোর্ট। Root directory `frontend`। Framework Vite।
2. Build `npm run build`। Output `dist`।
3. বিল্ডের আগে:

```text
VITE_API_BASE_URL=https://<your-service>.onrender.com
```

শেষে স্ল্যাশ নেই। Vite এটা বিল্ডের সময় ঢুকিয়ে দেয়। পরে বদলালে আবার ডিপ্লয় করতে হবে।

ভ্যারিয়েবল খালি থাকলে `vercel.app` সাইট `https://shadow-palette-backend.onrender.com` ধরে। সেই নামে সার্ভিস না থাকলে কাজ করবে না। লোকালহোস্ট এই ফলব্যাক ব্যবহার করে না।

## ডিপ্লয়ের পর

1. সাইট খুলে রেইড রাডারে অ্যাকাউন্ট `Player` এবং একটা সংখ্যা কিনা দেখুন। `Player 0null` হলে সেশন হয়নি। সার্ভার ঘুম থেকে উঠলে **Try again** চাপুন।
2. পাঁচটা ফ্যাকশন বেস থাকবে।
3. দ্বিতীয় ডিভাইস থেকে **Co-op / Duo** খুলে প্রথম খেলোয়াড়ের আইডি ইনভাইট করুন। দুজনে **Click to talk** চাপুন।
4. দুজনে **READY** দিন। লবি সরে না, **DROP IN** গুনে, তারপর দুজন একই বেসে ঢোকে। একা এস্কেপ করলে রেজাল্ট কার্ড **Return to base** না চাপা পর্যন্ত থাকে।

## ভাঙলে

| যা দেখছেন | যা করবেন |
|---|---|
| লগে `UnknownHostException` এবং MySQL হোস্ট | ডাটাসোর্স এনভ মুছুন, `SPRING_PROFILES_ACTIVE=local`, আবার ডিপ্লয় |
| `No active profile set` এবং Flyway MySQL খুলছে | একই কাজ। ড্যাশবোর্ডের এনভ `render.yaml`-কে সরিয়ে দিচ্ছে |
| খালি রাডার, `Player 0null` | ব্যাকএন্ড বন্ধ, অথবা Vercel বিল্ডে `VITE_API_BASE_URL` ছিল না |
| বন্ধু দেখা যাচ্ছে না | দুজনকেই রেইড স্ক্রিনে থাকতে হবে। ফ্রি ব্যাকএন্ড জেগে থাকতে হবে |
| ভয়েস শোনা যাচ্ছে না | দুজনে **Click to talk** এবং মাইক অনুমতি |
| একজন রেইডে ঢোকে, অন্যজন লবিতে থাকে | যে বিল্ডে `launchAt` আছে সেটা ডিপ্লয় করুন |
