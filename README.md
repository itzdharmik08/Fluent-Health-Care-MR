# Apex MR - Medicine Distributor & Representative Management System

A production-ready, mobile-first **Medicine Distributor & Medical Representative (MR) Management System** built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase PostgreSQL**.

---

## 🌟 Key Features

- **👨‍⚕️ Prescribing Doctors Directory**: Manage clinic locations, doctor specializations, phone contacts, GST numbers, and Level 2 doctor-specific special rates matrix.
- **💊 Medicines & Products Catalog**: Categorized catalog across 8 categories (`TAB/CAP`, `OINTMENT`, `SOAP/ LOTION`, `FACE WASH`, `INJECTION`, `HAIRFLU KIT`, `SERUM`, `GENERAL RANGE`).
- **✨ HAIRFLU KIT Master Consolidation**: Auto-merges sub-items into 1 Master Card showing **MRP ₹1,499.00** & **RET ₹500.00**.
- **📜 Price Change Audit Logging**: Automatically records rate change history into `medicine_price_history` with audit change reasons.
- **🧾 3-Step Order Entry Wizard**: Mobile-optimized invoice generator supporting 3-tier price priority calculation (Transaction Override $\rightarrow$ Doctor Rate $\rightarrow$ Catalog Rate).
- **💳 Payment Status & Mode Engine**: Real-time interactive dropdown selectors to update Payment Status (`Pending` ⏳ ↔ `Paid` ✅) and Payment Mode (`UPI` ↔ `Cash`).
- **📥 PDF & JSON Data File Importer**: Upload `Bhautik.pdf` or `sample_medicines.json` files with selection preview table & bulk upsert to Supabase.
- **🔍 Global Command Palette Search**: Press `/` anywhere to launch server-side debounced search across Doctors, Medicines, and Orders.
- **📊 Sales Analytics & Dashboard**: Real-time revenue metrics, recent orders feed, and Recharts trend visualizations.
- **🔒 Pure Supabase RLS Security**: 100% database-driven Row Level Security policies (`auth.uid() = user_id`).

---

## 🚀 Tech Stack

- **Frontend**: React 18 SPA, TypeScript 5, Vite 5
- **Styling**: Tailwind CSS v3, CSS Variables, Lucide React Icons
- **State Management**: Zustand
- **Routing**: React Router DOM v6 (with `ProtectedRoute` auth guards)
- **Forms & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts
- **Backend & Database**: Supabase PostgreSQL (`@supabase/supabase-js`)

---

## 🌐 Deploying to Vercel

### 1. Push to GitHub
Ensure all code is committed and pushed to your GitHub repository ([`https://github.com/itzdharmik08/Fluent-Health-Care-MR.git`](https://github.com/itzdharmik08/Fluent-Health-Care-MR.git)).

### 2. Import Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** $\rightarrow$ **"Project"**.
2. Connect your GitHub account and select `Fluent-Health-Care-MR`.

### 3. Add Environment Variables in Vercel
In Vercel project configuration, expand **Environment Variables** and add your Supabase credentials:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `YOUR_SUPABASE_PROJECT_URL` |
| `VITE_SUPABASE_ANON_KEY` | `YOUR_SUPABASE_ANON_KEY` |

### 4. Deploy!
Click **Deploy**. Vercel will automatically build the Vite SPA and route requests correctly via [`vercel.json`](vercel.json).

---

## ⚡ Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/itzdharmik08/Fluent-Health-Care-MR.git
cd Fluent-Health-Care-MR
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase project credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 🛡️ License

Distributed under the MIT License.
