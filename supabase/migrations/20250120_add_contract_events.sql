-- Create contract_events table to store blockchain events
CREATE TABLE IF NOT EXISTS public.contract_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_signature TEXT,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL,
  transaction_index INTEGER NOT NULL,
  log_index INTEGER NOT NULL,
  args JSONB DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  chain_id INTEGER NOT NULL,
  removed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate events
  CONSTRAINT unique_event UNIQUE (chain_id, transaction_hash, log_index)
);

-- Create indexes for efficient querying
CREATE INDEX idx_contract_events_project_id ON public.contract_events(project_id);
CREATE INDEX idx_contract_events_deployment_id ON public.contract_events(deployment_id);
CREATE INDEX idx_contract_events_contract_address ON public.contract_events(contract_address);
CREATE INDEX idx_contract_events_event_name ON public.contract_events(event_name);
CREATE INDEX idx_contract_events_block_number ON public.contract_events(block_number DESC);
CREATE INDEX idx_contract_events_timestamp ON public.contract_events(timestamp DESC);
CREATE INDEX idx_contract_events_chain_id ON public.contract_events(chain_id);
CREATE INDEX idx_contract_events_transaction_hash ON public.contract_events(transaction_hash);

-- Enable RLS
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can view events for their own projects
CREATE POLICY "Users can view their project events" ON public.contract_events
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert events for their own projects
CREATE POLICY "Users can insert events for their projects" ON public.contract_events
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete events for their own projects
CREATE POLICY "Users can delete events for their projects" ON public.contract_events
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Create function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(
  p_project_id UUID,
  p_contract_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  event_name TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.event_name,
    COUNT(*)::BIGINT as count
  FROM public.contract_events ce
  WHERE 
    ce.project_id = p_project_id
    AND (p_contract_address IS NULL OR ce.contract_address = p_contract_address)
  GROUP BY ce.event_name
  ORDER BY count DESC, ce.event_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_event_statistics TO authenticated;

-- Create function to clean old events (optional, for maintenance)
CREATE OR REPLACE FUNCTION clean_old_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.contract_events
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment on table and columns for documentation
COMMENT ON TABLE public.contract_events IS 'Stores blockchain events emitted by deployed contracts';
COMMENT ON COLUMN public.contract_events.project_id IS 'Reference to the project that owns the contract';
COMMENT ON COLUMN public.contract_events.deployment_id IS 'Reference to the specific deployment';
COMMENT ON COLUMN public.contract_events.args IS 'Decoded event arguments stored as JSON';
COMMENT ON COLUMN public.contract_events.topics IS 'Raw event topics from the blockchain';
COMMENT ON COLUMN public.contract_events.removed IS 'Whether the event was removed due to chain reorganization';