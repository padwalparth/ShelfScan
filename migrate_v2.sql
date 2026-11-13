-- ============================================================================
-- BatchScan AI · Supabase Database Schema Migration v2
-- Adds Soft Delete, FEFO Location/Shelf, Quantity, Alert Actions & RBAC Roles
-- ============================================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Safely add new columns to batch_scans
ALTER TABLE public.batch_scans 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS duplicate_of_id UUID,
    ADD COLUMN IF NOT EXISTS location_shelf TEXT DEFAULT 'Main Shelf A',
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS action_taken TEXT,           -- 'SOLD', 'DISCARDED', 'DISCOUNTED'
    ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS action_notes TEXT;

-- 2. Safely add new columns to inventory_batches
ALTER TABLE public.inventory_batches
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_shelf TEXT DEFAULT 'Main Shelf A',
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS action_taken TEXT,
    ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS action_notes TEXT;

-- 3. Indexes for soft delete & FEFO queries
CREATE INDEX IF NOT EXISTS idx_batch_scans_is_deleted ON public.batch_scans(is_deleted);
CREATE INDEX IF NOT EXISTS idx_batch_scans_location ON public.batch_scans(location_shelf);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_is_deleted ON public.inventory_batches(is_deleted);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_location ON public.inventory_batches(location_shelf);

-- 4. User Profiles & Role-Based Access Control (RBAC) Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'staff', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Audit Log Table for Compliance & Action Tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,                -- 'SCAN_CREATED', 'SCAN_EDITED', 'SCAN_DELETED', 'ALERT_ACTION', 'DATABASE_PURGED'
    target_type TEXT NOT NULL,           -- 'batch_scan', 'inventory_batch', 'system'
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Helper function to check user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
    'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Role-Based RLS Policies on batch_scans
DROP POLICY IF EXISTS "Role based read batch_scans" ON public.batch_scans;
CREATE POLICY "Role based read batch_scans" ON public.batch_scans
    FOR SELECT USING (
        -- Allow read if public anonymous OR user is viewer/staff/admin, filtered by is_deleted for viewers
        auth.role() = 'anon' OR 
        (public.current_user_role() IN ('admin', 'staff')) OR
        (public.current_user_role() = 'viewer' AND is_deleted = false)
    );

DROP POLICY IF EXISTS "Role based insert batch_scans" ON public.batch_scans;
CREATE POLICY "Role based insert batch_scans" ON public.batch_scans
    FOR INSERT WITH CHECK (
        auth.role() = 'anon' OR
        public.current_user_role() IN ('admin', 'staff')
    );

DROP POLICY IF EXISTS "Role based update batch_scans" ON public.batch_scans;
CREATE POLICY "Role based update batch_scans" ON public.batch_scans
    FOR UPDATE USING (
        auth.role() = 'anon' OR
        public.current_user_role() IN ('admin', 'staff')
    );

DROP POLICY IF EXISTS "Role based delete batch_scans" ON public.batch_scans;
CREATE POLICY "Role based delete batch_scans" ON public.batch_scans
    FOR DELETE USING (
        public.current_user_role() = 'admin'
    );

-- 8. Realtime updates for audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

