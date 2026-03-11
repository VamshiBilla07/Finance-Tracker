-- Custom Reasons Table
CREATE TABLE custom_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_text VARCHAR(100) NOT NULL,
  reason_type VARCHAR(20) NOT NULL CHECK (reason_type IN ('income', 'expense', 'budget', 'transaction')),
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_custom_reasons_user_type ON custom_reasons (user_id, reason_type);
