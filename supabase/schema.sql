-- ============================================================================
-- MR MEDICINE DISTRIBUTOR MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    company_name TEXT,
    default_gst_percent NUMERIC DEFAULT 12,
    default_discount_percent NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_name TEXT NOT NULL,
    clinic_name TEXT,
    specialization TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    area TEXT,
    gst_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEDICINES TABLE
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    company_name TEXT,
    composition TEXT,
    category TEXT DEFAULT 'GENERAL RANGE',
    strength TEXT,
    packing TEXT,
    mrp NUMERIC DEFAULT 0,
    base_price NUMERIC DEFAULT 0,
    gst_percent NUMERIC DEFAULT 12,
    current_rate NUMERIC DEFAULT 0,
    minimum_rate NUMERIC DEFAULT 0,
    maximum_rate NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'Box',
    description TEXT,
    pdf_source TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DOCTOR SPECIFIC MEDICINE RATES
CREATE TABLE IF NOT EXISTS public.doctor_medicine_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    rate NUMERIC NOT NULL,
    gst_percent NUMERIC,
    discount_percent NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, medicine_id)
);

-- 5. MEDICINE PRICE HISTORY
CREATE TABLE IF NOT EXISTS public.medicine_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    old_rate NUMERIC,
    new_rate NUMERIC,
    old_mrp NUMERIC,
    new_mrp NUMERIC,
    reason TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    order_date TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    gst_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_mode TEXT DEFAULT 'Cash',
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER ITEMS TABLE (With snapshot data for audit immutability)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    medicine_name_snapshot TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    gst_percent NUMERIC DEFAULT 0,
    gst_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR FAST PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_search ON public.doctors USING gin (doctor_name gin_trgm_ops, clinic_name gin_trgm_ops, phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_search ON public.medicines USING gin (medicine_name gin_trgm_ops, brand_name gin_trgm_ops, generic_name gin_trgm_ops, company_name gin_trgm_ops, composition gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_doc_rates_doc ON public.doctor_medicine_rates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_rates_med ON public.doctor_medicine_rates(medicine_id);

CREATE INDEX IF NOT EXISTS idx_price_history_med ON public.medicine_price_history(medicine_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_doctor_id ON public.orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_medicine_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Doctors Policies
CREATE POLICY "Users can view their own doctors" ON public.doctors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own doctors" ON public.doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own doctors" ON public.doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own doctors" ON public.doctors FOR DELETE USING (auth.uid() = user_id);

-- Medicines Policies
CREATE POLICY "Users can view their own medicines" ON public.medicines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own medicines" ON public.medicines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own medicines" ON public.medicines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own medicines" ON public.medicines FOR DELETE USING (auth.uid() = user_id);

-- Doctor Specific Rates Policies (Checked via parent doctor)
CREATE POLICY "Users can view their doctor rates" ON public.doctor_medicine_rates 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_medicine_rates.doctor_id AND doctors.user_id = auth.uid()));

CREATE POLICY "Users can insert their doctor rates" ON public.doctor_medicine_rates 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_medicine_rates.doctor_id AND doctors.user_id = auth.uid()));

CREATE POLICY "Users can update their doctor rates" ON public.doctor_medicine_rates 
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_medicine_rates.doctor_id AND doctors.user_id = auth.uid()));

CREATE POLICY "Users can delete their doctor rates" ON public.doctor_medicine_rates 
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_medicine_rates.doctor_id AND doctors.user_id = auth.uid()));

-- Medicine Price History Policies
CREATE POLICY "Users can view their price history" ON public.medicine_price_history 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.medicines WHERE medicines.id = medicine_price_history.medicine_id AND medicines.user_id = auth.uid()));

CREATE POLICY "Users can insert price history" ON public.medicine_price_history 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.medicines WHERE medicines.id = medicine_price_history.medicine_id AND medicines.user_id = auth.uid()));

-- Orders Policies
CREATE POLICY "Users can view their orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- Order Items Policies
CREATE POLICY "Users can view order items" ON public.order_items 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Users can insert order items" ON public.order_items 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- ============================================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_doctors_modtime BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_medicines_modtime BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_doc_rates_modtime BEFORE UPDATE ON public.doctor_medicine_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- AUTOMATIC BACKFILL FOR EXISTING AUTH USERS
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)), 
    NOW(), 
    NOW()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. SYSTEM BACKUPS TABLE (Cloud & Local Sync for 12:00 AM & Manual Backups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_backups (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    label TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    metadata JSONB NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_backups_user_id ON public.system_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_system_backups_created_at ON public.system_backups(created_at DESC);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their backups" ON public.system_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their backups" ON public.system_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their backups" ON public.system_backups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their backups" ON public.system_backups FOR DELETE USING (auth.uid() = user_id);

