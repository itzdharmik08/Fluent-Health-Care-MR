-- ============================================================================
-- DEMO SEED DATA FOR TESTING / INITIAL SETUP
-- ============================================================================

-- Note: Replace '00000000-0000-0000-0000-000000000000' with your actual Supabase auth user UUID if inserting manually via SQL editor.

DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000000';
    doc1_id UUID := gen_random_uuid();
    doc2_id UUID := gen_random_uuid();
    doc3_id UUID := gen_random_uuid();
    med1_id UUID := gen_random_uuid();
    med2_id UUID := gen_random_uuid();
    med3_id UUID := gen_random_uuid();
    med4_id UUID := gen_random_uuid();
    med5_id UUID := gen_random_uuid();
BEGIN
    -- Check if demo user exists, if not use a dummy ID for seed sample structure
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        SELECT id INTO demo_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 1. Insert Profile
    INSERT INTO public.profiles (id, full_name, phone, email, company_name)
    VALUES (demo_user_id, 'Apex Pharma MR', '9876543210', 'mr@apexpharma.com', 'Apex Pharma Distributors')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- 2. Insert Sample Doctors
    INSERT INTO public.doctors (id, user_id, doctor_name, clinic_name, specialization, phone, email, address, city, area, gst_number)
    VALUES
    (doc1_id, demo_user_id, 'Dr. Raj Patel', 'Patel Heart & Heart Clinic', 'Cardiologist', '9876543210', 'dr.raj@patelclinic.com', '101 Horizon Towers, Vesu', 'Surat', 'Vesu', '24AAAAA0000A1Z5'),
    (doc2_id, demo_user_id, 'Dr. Amit Shah', 'Shah Child Care Clinic', 'Pediatrician', '9825012345', 'amit.shah@gmail.com', 'Shop 4, Sunrise Complex, Adajan', 'Surat', 'Adajan', '24BBBBB1111B1Z2'),
    (doc3_id, demo_user_id, 'Dr. Neha Mehta', 'Mehta Multispecialty Hospital', 'General Physician', '9898098980', 'drneha@mehtahospital.org', 'Ring Road Opp City Center', 'Surat', 'Ring Road', '24CCCCC2222C1Z9')
    ON CONFLICT DO NOTHING;

    -- 3. Insert Sample Medicines
    INSERT INTO public.medicines (id, user_id, medicine_name, brand_name, generic_name, company_name, composition, strength, packing, mrp, base_price, gst_percent, current_rate)
    VALUES
    (med1_id, demo_user_id, 'Paracetamol 500mg', 'Calpol 500', 'Paracetamol', 'GSK Pharma', 'Paracetamol IP 500mg', '500mg', '10x10 Tablets', 120.00, 75.00, 12.0, 95.00),
    (med2_id, demo_user_id, 'Azithromycin 500mg', 'Azee 500', 'Azithromycin', 'Cipla Ltd', 'Azithromycin Dihydrate 500mg', '500mg', '1x5 Tablets', 175.00, 110.00, 12.0, 140.00),
    (med3_id, demo_user_id, 'Vitamin D3 Sachet', 'Calcirol 60K', 'Cholecalciferol', 'Cadila Healthcare', 'Cholecalciferol 60,000 IU', '60K IU', '1x1g Sachet', 240.00, 150.00, 18.0, 190.00),
    (med4_id, demo_user_id, 'Pantoprazole 40mg', 'Pan 40', 'Pantoprazole', 'Alkem Labs', 'Pantoprazole Sodium 40mg', '40mg', '10x15 Tablets', 155.00, 90.00, 12.0, 115.00),
    (med5_id, demo_user_id, 'Amoxicillin & Potassium Clavulanate', 'Moxikind-CV 625', 'Amoxicillin + Clavulanic Acid', 'Mankind Pharma', 'Amoxicillin 500mg + Clavulanic Acid 125mg', '625mg', '1x10 Strip', 210.00, 130.00, 12.0, 165.00)
    ON CONFLICT DO NOTHING;

    -- 4. Insert Doctor Specific Negotiated Rates
    INSERT INTO public.doctor_medicine_rates (doctor_id, medicine_id, rate, gst_percent, discount_percent, notes)
    VALUES
    (doc1_id, med1_id, 88.00, 12.0, 2.0, 'Bulk monthly clinic order rate'),
    (doc1_id, med2_id, 132.00, 12.0, 5.0, 'Special cardiologist discount'),
    (doc2_id, med3_id, 180.00, 18.0, 0.0, 'Pediatric clinic standard rate')
    ON CONFLICT DO NOTHING;

    -- 5. Insert Sample Price History
    INSERT INTO public.medicine_price_history (medicine_id, old_rate, new_rate, old_mrp, new_mrp, reason, effective_date)
    VALUES
    (med1_id, 88.00, 95.00, 110.00, 120.00, 'Distributor price revision due to raw material costs', CURRENT_DATE - INTERVAL '15 days'),
    (med2_id, 130.00, 140.00, 160.00, 175.00, 'Annual MRP adjustment', CURRENT_DATE - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;

END $$;
