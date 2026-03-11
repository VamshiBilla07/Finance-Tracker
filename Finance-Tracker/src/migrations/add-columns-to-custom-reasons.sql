-- Add type column to custom_reasons table
ALTER TABLE custom_reasons 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add category column to custom_reasons table
ALTER TABLE custom_reasons 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Comment for documentation
COMMENT ON COLUMN custom_reasons.type IS 'Type of reason: income, expense, or budget';
COMMENT ON COLUMN custom_reasons.category IS 'Related transaction category';

-- Create an index on the type column for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_reasons_type ON custom_reasons(type);
