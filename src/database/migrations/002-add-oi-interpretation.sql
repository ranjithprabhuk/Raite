-- Add OI interpretation column to candles table
DO $$ 
BEGIN
    -- Create enum type for OI interpretation if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oi_interpretation') THEN
        CREATE TYPE oi_interpretation AS ENUM (
            'LONG_BUILDUP', 
            'SHORT_BUILDUP', 
            'LONG_UNWINDING', 
            'SHORT_COVERING',
            'INCONCLUSIVE'
        );
    END IF;
END $$;

-- Add the OI interpretation column
ALTER TABLE candles 
ADD COLUMN IF NOT EXISTS oi_interpretation oi_interpretation;

-- Add index for OI interpretation queries
CREATE INDEX IF NOT EXISTS idx_candles_oi_interpretation 
ON candles (instrument, oi_interpretation) 
WHERE oi_interpretation IS NOT NULL;
