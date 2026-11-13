-- ============================================================================
-- BatchScan AI · Supabase Database Schema & Migration Script
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: batch_scans (Stores individual scan events & raw OCR extractions)
CREATE TABLE IF NOT EXISTS public.batch_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    source_filename TEXT,
    batch_number TEXT,
    mfg_date TEXT,
    exp_date TEXT,
    mrp TEXT,
    product_name TEXT,
    manufacturer TEXT,
    expiry_status TEXT DEFAULT 'UNKNOWN',
    days_left INTEGER,
    confidence_score NUMERIC(5, 2) DEFAULT 0.95,
    raw_ocr_text TEXT,
    extracted_json JSONB,
    model_used TEXT,
    ground_truth_match BOOLEAN,
    notes TEXT
);

-- 2. Table: inventory_batches (Master aggregation of unique batches across scans)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT UNIQUE NOT NULL,
    product_name TEXT,
    mfg_date TEXT,
    exp_date TEXT,
    mrp TEXT,
    status TEXT DEFAULT 'VALID',
    total_scans INTEGER DEFAULT 1,
    first_scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_batch_scans_batch_number ON public.batch_scans(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_scans_expiry_status ON public.batch_scans(expiry_status);
CREATE INDEX IF NOT EXISTS idx_batch_scans_created_at ON public.batch_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch_number ON public.inventory_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_status ON public.inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_last_scanned ON public.inventory_batches(last_scanned_at DESC);

-- 4. Enable Row Level Security (RLS) & Public Policies for App Client
ALTER TABLE public.batch_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated reads, inserts, updates, deletes for app operations
DROP POLICY IF EXISTS "Allow public read on batch_scans" ON public.batch_scans;
CREATE POLICY "Allow public read on batch_scans" ON public.batch_scans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on batch_scans" ON public.batch_scans;
CREATE POLICY "Allow public insert on batch_scans" ON public.batch_scans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on batch_scans" ON public.batch_scans;
CREATE POLICY "Allow public update on batch_scans" ON public.batch_scans FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on batch_scans" ON public.batch_scans;
CREATE POLICY "Allow public delete on batch_scans" ON public.batch_scans FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read on inventory_batches" ON public.inventory_batches;
CREATE POLICY "Allow public read on inventory_batches" ON public.inventory_batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inventory_batches" ON public.inventory_batches;
CREATE POLICY "Allow public insert on inventory_batches" ON public.inventory_batches FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inventory_batches" ON public.inventory_batches;
CREATE POLICY "Allow public update on inventory_batches" ON public.inventory_batches FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on inventory_batches" ON public.inventory_batches;
CREATE POLICY "Allow public delete on inventory_batches" ON public.inventory_batches FOR DELETE USING (true);

-- 5. Enable Realtime updates
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_scans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_batches;
