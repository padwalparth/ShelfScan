-- ============================================================================
-- BatchScan AI · Supabase Database Schema Migration (Non-Destructive)
-- Adds fields for Automatic Label Detection, Cropping & Image Paths
-- ============================================================================

-- Add new columns safely with IF NOT EXISTS
ALTER TABLE public.batch_scans 
    ADD COLUMN IF NOT EXISTS original_image_path TEXT,
    ADD COLUMN IF NOT EXISTS cropped_image_path TEXT,
    ADD COLUMN IF NOT EXISTS enhanced_image_path TEXT,
    ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS detection_method TEXT,
    ADD COLUMN IF NOT EXISTS crop_coordinates JSONB,
    ADD COLUMN IF NOT EXISTS validation_status JSONB;

-- Performance index for source image path lookups
CREATE INDEX IF NOT EXISTS idx_batch_scans_cropped_image ON public.batch_scans(cropped_image_path);

