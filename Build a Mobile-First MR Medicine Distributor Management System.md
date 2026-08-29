# Build a Mobile-First MR Medicine Distributor Management System

Create a complete, production-ready **Medicine Distributor / Medical Representative (MR) Management System** for managing doctors, medicines, pricing, GST, invoices/orders, and related records.

The application must be built using:

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Supabase for authentication and database
- Responsive/mobile-first UI
- No React, Vue, Angular, or other frontend frameworks
- Use Supabase JavaScript client for database/auth operations

The UI should feel like a **modern SaaS/mobile application**, not an old-fashioned admin panel.

---

## 1. MAIN PURPOSE

This system is designed for a medicine distributor / MR who visits local doctors and manages:

- Doctors
- Medicine products
- Medicine pricing
- Doctor-specific pricing
- GST
- Quantity
- Discounts
- Price increases
- Orders
- Sales records
- Doctor-wise medicine history
- Search
- Reports
- Customer/doctor records

The system should make it extremely quick to:

1. Add a doctor
2. Search/select a doctor
3. Search/select a medicine
4. Enter quantity
5. Automatically calculate price
6. Apply doctor-specific rate
7. Calculate GST
8. Calculate subtotal
9. Calculate discount if applicable
10. Calculate final amount
11. Save the transaction
12. View previous transactions

---

# 2. AUTHENTICATION

Use **Supabase Auth**.

Implement:

- Email/password signup
- Email/password login
- Logout
- Forgot password
- Reset password
- Protected application pages
- Session persistence
- Automatic session checking

Only authenticated users should be able to access the application.

Create a clean login screen:

- Logo/application name
- Email
- Password
- Show/hide password
- Login button
- Forgot password
- Create account

After login, redirect to the dashboard.

---

# 3. SUPABASE DATABASE

Create a proper relational database structure.

Use UUID primary keys wherever appropriate.

Recommended tables:

## users / profiles

```text
profiles
---------
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT
phone TEXT
email TEXT
company_name TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## doctors

```text
doctors
---------
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
doctor_name TEXT NOT NULL
clinic_name TEXT
specialization TEXT
phone TEXT
email TEXT
address TEXT
city TEXT
area TEXT
gst_number TEXT
notes TEXT
status TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## medicines

Store the medicines imported from the provided PDF.

```text
medicines
---------
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
medicine_name TEXT NOT NULL
generic_name TEXT
brand_name TEXT
company_name TEXT
composition TEXT
strength TEXT
packing TEXT
mrp NUMERIC
base_price NUMERIC
gst_percent NUMERIC DEFAULT 0
current_rate NUMERIC
minimum_rate NUMERIC
maximum_rate NUMERIC
unit TEXT
description TEXT
pdf_source TEXT
status TEXT DEFAULT 'active'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Do NOT duplicate medicines unnecessarily.

---

# 4. DOCTOR-SPECIFIC MEDICINE RATES

A doctor may have a different negotiated rate for a medicine.

Create:

```text
doctor_medicine_rates
---------------------
id UUID PRIMARY KEY
doctor_id UUID REFERENCES doctors(id)
medicine_id UUID REFERENCES medicines(id)
rate NUMERIC NOT NULL
gst_percent NUMERIC
discount_percent NUMERIC DEFAULT 0
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

When a medicine is selected for a doctor:

1. Check whether doctor-specific pricing exists.
2. If yes, use doctor-specific rate.
3. Otherwise use medicine current_rate.
4. Apply GST.
5. Apply discount where applicable.
6. Show complete calculation.

---

# 5. PRICE INCREASE / RATE HISTORY

Do not simply overwrite the old medicine price.

Maintain price history.

Create:

```text
medicine_price_history
----------------------
id UUID PRIMARY KEY
medicine_id UUID REFERENCES medicines(id)
old_rate NUMERIC
new_rate NUMERIC
old_mrp NUMERIC
new_mrp NUMERIC
reason TEXT
effective_date DATE
created_at TIMESTAMPTZ
```

When a medicine rate changes:

- Save the previous rate
- Save the new rate
- Record the date
- Record the reason
- Update medicines.current_rate

Add a "Rate History" section.

Example:

```text
Medicine: XYZ Tablet

₹120 → ₹135
Increase: ₹15
Effective: 29 Aug 2026
Reason: Distributor price revision
```

---

# 6. PDF MEDICINE IMPORT

The user will provide a PDF containing medicine/product information.

Create a medicine import workflow.

The application should support importing medicine information from the provided PDF.

Important:

- Do not manually hard-code medicine names.
- Extract structured information from the PDF.
- Map columns/fields intelligently.
- Show a preview before importing.
- Allow the user to edit incorrect rows.
- Allow duplicate detection.
- Allow the user to skip duplicates.
- Provide import confirmation.

Example imported fields:

```text
Medicine Name
Brand
Company
Composition
Strength
Packing
MRP
Base Price
GST
Current Rate
```

If the PDF has different column names, map them intelligently.

Create an import screen:

```text
Import Medicines

[ Select PDF ]

        ↓

Processing PDF...

        ↓

Preview

Medicine       MRP      GST      Rate
ABC Tablet     ₹100     12%      ₹80
XYZ Syrup      ₹150     18%      ₹120

[Cancel] [Import 245 Medicines]
```

If browser-only PDF parsing is insufficient, structure the application so a future server-side PDF extraction function can be added without redesigning the database.

---

# 7. MODERN SEARCH SYSTEM

Build a very fast modern search experience.

Search should work for:

- Doctors
- Medicines
- Companies
- Generic names
- Brand names
- Composition
- Phone numbers
- Clinic names

The search UI should resemble modern applications such as Notion/Linear/Google-style search.

Features:

- Search as you type
- Debounced search
- Keyboard navigation
- Highlight matching text
- Recent searches
- Search categories
- Empty state
- Loading state
- No-result state
- Clear search button
- Mobile-friendly search overlay

Example:

```text
🔍 Search doctors or medicines...

Recent
────────────────
Dr. Patel
Paracetamol 500mg

Medicines
────────────────
Paracetamol 500mg
Paracetamol Plus
Paracetamol Syrup

Doctors
────────────────
Dr. Raj Patel
Dr. Amit Shah
```

On desktop:

- Support `/` keyboard shortcut to open search.

On mobile:

- Full-screen search experience.

---

# 8. DASHBOARD

Create a modern dashboard.

Show:

```text
Good Morning

Dashboard

┌──────────────────────┐
│ Doctors              │
│ 124                   │
└──────────────────────┘

┌──────────────────────┐
│ Medicines             │
│ 842                   │
└──────────────────────┘

┌──────────────────────┐
│ Today's Orders        │
│ 18                    │
└──────────────────────┘

┌──────────────────────┐
│ Today's Sales         │
│ ₹24,580               │
└──────────────────────┘
```

Also show:

- Recent doctors
- Recent orders
- Recently updated medicine rates
- Top medicines
- Quick actions

Quick action buttons:

```text
+ Add Doctor
+ Add Medicine
+ New Order
Import PDF
```

---

# 9. DOCTOR MANAGEMENT

Create doctor CRUD functionality.

Pages/components:

- Doctor list
- Add doctor
- Edit doctor
- Doctor details
- Delete/deactivate doctor
- Doctor search

Doctor card:

```text
Dr. Raj Patel
Cardiologist

Patel Clinic
Vesu, Surat

📞 9876543210

[View]
```

Doctor detail page:

```text
Dr. Raj Patel

Cardiologist
Patel Clinic

Contact
Address

────────────────

Medicine Rates

Paracetamol 500mg     ₹82
Azithromycin 500mg    ₹145
Vitamin D3             ₹190

────────────────

Order History

29 Aug 2026    ₹4,250
25 Aug 2026    ₹2,840
```

---

# 10. MEDICINE MANAGEMENT

Create medicine management.

Features:

- Medicine list
- Search
- Add medicine
- Edit medicine
- Deactivate medicine
- View medicine
- Rate history
- Doctor-specific rates

Medicine card:

```text
Paracetamol 500mg

ABC Pharma

Pack: 10 x 10

MRP: ₹120
Current Rate: ₹95
GST: 12%

[View]
```

---

# 11. NEW ORDER / ENTRY SCREEN

This is the most important screen.

Make it extremely fast and mobile-friendly.

Workflow:

### Step 1

Select Doctor

```text
Select Doctor

🔍 Search doctor...

Dr. Raj Patel
Dr. Amit Shah
Dr. Mehta
```

### Step 2

Add medicine

```text
Add Medicine

🔍 Search medicine...

Paracetamol 500mg
Azithromycin 500mg
Vitamin D3
```

### Step 3

Enter quantity

```text
Quantity
[-] 10 [+]
```

### Step 4

Automatically calculate:

```text
Medicine
Paracetamol 500mg

Rate
₹95

Quantity
10

Subtotal
₹950

GST (12%)
₹114

Total
₹1,064
```

Allow:

- Quantity
- Rate override
- Discount
- GST
- Notes

---

# 12. CALCULATION ENGINE

Create a centralized JavaScript calculation module.

Do NOT duplicate calculation logic across UI components.

Formula:

```text
base_amount = rate × quantity

discount_amount =
base_amount × discount_percent / 100

taxable_amount =
base_amount - discount_amount

gst_amount =
taxable_amount × gst_percent / 100

final_amount =
taxable_amount + gst_amount
```

Example:

```text
Rate = ₹100
Quantity = 10
GST = 12%
Discount = 5%

Base:
100 × 10 = ₹1,000

Discount:
₹1,000 × 5% = ₹50

Taxable:
₹950

GST:
₹950 × 12% = ₹114

Final:
₹1,064
```

Always format currency using Indian formatting:

```text
₹1,064.00
```

---

# 13. ORDER DATABASE

Create:

```text
orders
------
id UUID PRIMARY KEY
user_id UUID
doctor_id UUID
order_number TEXT
order_date TIMESTAMPTZ
subtotal NUMERIC
discount_amount NUMERIC
gst_amount NUMERIC
total_amount NUMERIC
notes TEXT
status TEXT
created_at TIMESTAMPTZ
```

And:

```text
order_items
-----------
id UUID PRIMARY KEY
order_id UUID
medicine_id UUID
medicine_name_snapshot TEXT
quantity NUMERIC
rate NUMERIC
discount_percent NUMERIC
discount_amount NUMERIC
gst_percent NUMERIC
gst_amount NUMERIC
subtotal NUMERIC
total_amount NUMERIC
created_at TIMESTAMPTZ
```

Store medicine_name_snapshot and pricing snapshots so historical orders don't change when the medicine master price changes.

---

# 14. ORDER HISTORY

Create an order history page.

Filters:

- Date
- Doctor
- Medicine
- Amount
- Status

Example:

```text
Orders

29 Aug 2026
Dr. Raj Patel
5 medicines

₹4,250

────────────────

28 Aug 2026
Dr. Amit Shah
3 medicines

₹2,840
```

Order detail:

```text
Order #ORD-000124

Dr. Raj Patel
29 Aug 2026

Medicine             Qty    Rate
───────────────────────────────
Paracetamol           10     ₹95
Azithromycin           5     ₹140
Vitamin D3             4     ₹180

Subtotal              ₹2,170
Discount                 ₹50
GST                     ₹254
───────────────────────────────
TOTAL                 ₹2,374
```

---

# 15. MOBILE-FIRST DESIGN

This application must be designed mobile-first.

Prioritize:

- One-handed operation
- Large touch targets
- Bottom navigation
- Sticky action buttons
- Mobile search
- Fast forms
- Minimal typing
- Cards instead of large tables

Bottom navigation:

```text
Home
Doctors
Medicines
Orders
More
```

On desktop, convert this into a sidebar.

Use responsive breakpoints.

---

# 16. UI DESIGN

Design style:

- Modern SaaS
- Clean
- Minimal
- Professional medical/business application
- White/light background
- Subtle borders
- Rounded cards
- Good typography
- Strong visual hierarchy
- Accessible contrast
- Smooth transitions

Do not make the UI overly colorful.

Use:

- CSS variables
- CSS Grid
- Flexbox
- Responsive layout
- Modal dialogs
- Toast notifications
- Skeleton loaders
- Empty states

Avoid unnecessary animations.

---

# 17. SECURITY

Implement Supabase Row Level Security.

Every user's data must be isolated.

A user must only be able to access:

- Their doctors
- Their medicines
- Their orders
- Their price history
- Their doctor-specific rates

Never rely only on frontend filtering.

Create proper RLS policies.

Example concept:

```sql
auth.uid() = user_id
```

For related records, ensure access is verified through the owning user's records.

Never expose Supabase service-role keys in frontend JavaScript.

Only the Supabase anon/public key may be used client-side.

---

# 18. DATABASE INDEXING

Add indexes for commonly searched fields.

For example:

```text
doctors.doctor_name
doctors.phone
doctors.clinic_name

medicines.medicine_name
medicines.brand_name
medicines.generic_name
medicines.company_name
medicines.composition

orders.doctor_id
orders.order_date
```

Use PostgreSQL indexes and appropriate search techniques.

For modern search, consider PostgreSQL:

- ILIKE
- Full-text search
- pg_trgm extension where appropriate

Avoid downloading the entire medicine table to the browser just to search it.

---

# 19. SEARCH PERFORMANCE

Medicine databases may contain thousands of records.

Therefore:

- Search server-side
- Debounce search input around 250–350ms
- Limit results
- Paginate lists
- Fetch only required columns
- Avoid unnecessary Supabase queries
- Cache frequently accessed data where appropriate

Search should feel instant.

---

# 20. SETTINGS

Create Settings page.

Sections:

### Profile

- Name
- Phone
- Email
- Company

### GST

- Default GST
- GST-inclusive/exclusive setting

### Pricing

- Default markup
- Default discount

### Application

- Currency
- Date format
- Theme

---

# 21. DATA VALIDATION

Validate all forms.

Examples:

Doctor:

- Name required
- Phone format
- Email format

Medicine:

- Name required
- Rate must be numeric
- GST must be 0–100
- MRP cannot be negative

Order:

- Doctor required
- At least one medicine required
- Quantity > 0
- Rate >= 0

Show friendly inline validation.

---

# 22. ERROR HANDLING

Handle Supabase errors properly.

Never show raw technical errors such as:

```text
PostgrestException...
```

Instead show:

```text
Unable to save the doctor.
Please check your connection and try again.
```

Implement:

- Loading states
- Error states
- Retry buttons
- Toast notifications
- Offline-friendly UI messaging

---

# 23. PROJECT STRUCTURE

Use a clean structure:

```text
/
├── index.html
├── login.html
├── dashboard.html
├── doctors.html
├── medicines.html
├── orders.html
├── settings.html
│
├── css/
│   ├── variables.css
│   ├── global.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── supabase.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── doctors.js
│   ├── medicines.js
│   ├── orders.js
│   ├── search.js
│   ├── calculations.js
│   ├── pdf-import.js
│   ├── validation.js
│   └── utils.js
│
└── supabase/
    └── schema.sql
```

---

# 24. SUPABASE SETUP

Create a complete `schema.sql`.

The SQL should include:

- Extensions
- Tables
- Foreign keys
- Constraints
- Indexes
- RLS
- RLS policies
- Useful functions/triggers
- Updated_at triggers

Create a profile automatically when a user signs up.

---

# 25. ENVIRONMENT CONFIGURATION

Create:

```text
config.js
```

with:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Clearly explain that the anon key is safe for browser use when RLS is correctly configured, but service-role credentials must NEVER be placed in frontend code.

---

# 26. DEMO DATA

Create an optional SQL seed file containing sample:

- Doctors
- Medicines
- Doctor-specific rates
- Orders

Use clearly fake/demo data.

---

# 27. UX DETAILS

Add confirmation dialogs for destructive actions.

Example:

```text
Delete Doctor?

Are you sure you want to remove Dr. Raj Patel?

This action cannot be undone.

[Cancel] [Delete]
```

Use toast messages:

```text
Doctor added successfully
Medicine updated successfully
Order saved successfully
Rate updated successfully
```

---

# 28. IMPORTANT MEDICINE PRICING RULE

Make pricing flexible.

There should be three levels:

### Level 1 — Medicine Default Rate

```text
Paracetamol
Default Rate: ₹95
```

### Level 2 — Doctor-Specific Rate

```text
Dr. Patel
Paracetamol
Special Rate: ₹90
```

### Level 3 — Transaction Override

During an order, the user can temporarily change the rate:

```text
Default: ₹95
Doctor Rate: ₹90

Final Transaction Rate:
₹88
```

Always preserve the actual transaction rate inside `order_items`.

---

# 29. AUDIT / HISTORY

Where appropriate, preserve history rather than silently overwriting business-critical values.

Especially:

- Medicine price changes
- Doctor-specific rate changes
- Orders
- Discounts

The system should make it possible to understand why a historical total was calculated.

---

# 30. RESPONSIVENESS

Test the UI at:

```text
320px
375px
390px
430px
768px
1024px
1280px
1440px
```

It must work properly on:

- Android phones
- iPhones
- Tablets
- Desktop browsers

Avoid horizontal scrolling on mobile.

---

# 31. ACCESSIBILITY

Implement:

- Semantic HTML
- Keyboard navigation
- Focus states
- Labels for inputs
- ARIA labels where required
- Proper contrast
- Accessible modals
- Escape-to-close modals

---

# 32. FINAL IMPLEMENTATION REQUIREMENT

Do not just create a visual prototype.

Build the application with:

1. Working Supabase authentication
2. Working Supabase database
3. Working CRUD
4. Working search
5. Working medicine import workflow
6. Working doctor management
7. Working medicine management
8. Working pricing
9. Working GST calculation
10. Working discount calculation
11. Working order creation
12. Working order history
13. Working price history
14. Working RLS
15. Responsive mobile-first UI

Before finishing, test:

- Signup
- Login
- Logout
- Add doctor
- Edit doctor
- Search doctor
- Add medicine
- Search medicine
- Import medicine data
- Set doctor-specific rate
- Increase medicine price
- Create order
- Calculate GST
- Calculate discount
- Save order
- View order history
- Delete/deactivate records
- Mobile layout
- Desktop layout
- Unauthorized data access

Do not use fake API calls or fake database implementations.

If something cannot be implemented purely in frontend HTML/CSS/JS, clearly identify it and provide the correct Supabase-side implementation instead.

The final application should be clean, scalable, secure, and ready to deploy.