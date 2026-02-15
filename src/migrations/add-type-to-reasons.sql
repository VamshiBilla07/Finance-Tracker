-- Add 'type' column to custom_reasons table if it doesn't already exist
ALTER TABLE custom_reasons 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Update existing reasons to have appropriate types based on their content
-- This is a simple heuristic - you might need to adjust based on your actual data
UPDATE custom_reasons
SET type = 
  CASE
    WHEN reason_text LIKE '%salary%' OR reason_text LIKE '%income%' OR reason_text LIKE '%earning%' THEN 'income'
    WHEN reason_text LIKE '%expense%' OR reason_text LIKE '%bill%' OR reason_text LIKE '%cost%' THEN 'expense'
    WHEN reason_text LIKE '%budget%' OR reason_text LIKE '%plan%' OR reason_text LIKE '%goal%' THEN 'budget'
    ELSE 'income' -- Default fallback
  END
WHERE type IS NULL;

-- Make the type column NOT NULL after migrating existing data
ALTER TABLE custom_reasons
ALTER COLUMN type SET NOT NULL;

-- Create an index on the type column for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_reasons_type ON custom_reasons(type);

-- Add documentation about types
COMMENT ON COLUMN custom_reasons.type IS 'Reason type: income, expense, or budget';
