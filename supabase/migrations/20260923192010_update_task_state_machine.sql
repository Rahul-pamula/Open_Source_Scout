-- Create new enum type
CREATE TYPE execution_state AS ENUM (
  'QUEUED',
  'ACTIVE',
  'PAUSED',
  'CANCEL_REQUESTED',
  'STOPPING',
  'CANCELLED',
  'BLOCKED',
  'FAILED',
  'COMPLETED',
  'SUBMITTED'
);

-- Migrate tracked_issues.state
ALTER TABLE public.tracked_issues
  ALTER COLUMN state DROP DEFAULT,
  ALTER COLUMN state TYPE execution_state USING (
    CASE state::text
      WHEN ''DISCOVERED'' THEN ''QUEUED''
      WHEN ''EVALUATED'' THEN ''QUEUED''
      WHEN ''DRAFTED'' THEN ''QUEUED''
      WHEN ''ENGAGED'' THEN ''ACTIVE''
      WHEN ''ASSIGNED'' THEN ''ACTIVE''
      WHEN ''COMPLETED'' THEN ''COMPLETED''
      WHEN ''REJECTED'' THEN ''CANCELLED''
      ELSE ''QUEUED''
    END::execution_state
  ),
  ALTER COLUMN state SET DEFAULT ''QUEUED''::execution_state;

-- Migrate tasks.state
ALTER TABLE public.tasks
  ALTER COLUMN state DROP DEFAULT,
  ALTER COLUMN state TYPE execution_state USING (
    CASE state::text
      WHEN ''DISCOVERED'' THEN ''QUEUED''
      WHEN ''EVALUATED'' THEN ''QUEUED''
      WHEN ''DRAFTED'' THEN ''QUEUED''
      WHEN ''ENGAGED'' THEN ''ACTIVE''
      WHEN ''ASSIGNED'' THEN ''ACTIVE''
      WHEN ''COMPLETED'' THEN ''COMPLETED''
      WHEN ''REJECTED'' THEN ''CANCELLED''
      ELSE ''QUEUED''
    END::execution_state
  ),
  ALTER COLUMN state SET DEFAULT ''QUEUED''::execution_state;

-- Migrate task_sessions.status
-- We assume current values are 'active', 'submitted', 'blocked' (lowercase)
ALTER TABLE public.task_sessions
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE execution_state USING (
    CASE LOWER(status)
      WHEN ''active'' THEN ''ACTIVE''
      WHEN ''submitted'' THEN ''SUBMITTED''
      WHEN ''blocked'' THEN ''BLOCKED''
      ELSE ''ACTIVE''
    END::execution_state
  ),
  ALTER COLUMN status SET DEFAULT ''ACTIVE''::execution_state;

-- Drop old enum
DROP TYPE issue_state;

-- Update the state transition guard for execution model
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS trigger AS 86105
BEGIN
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions for the new execution model
  IF OLD.state = ''QUEUED'' AND NEW.state NOT IN (''ACTIVE'', ''CANCELLED'') THEN
    RAISE EXCEPTION ''Invalid transition from QUEUED to %'', NEW.state;
  ELSIF OLD.state = ''ACTIVE'' AND NEW.state NOT IN (''PAUSED'', ''CANCEL_REQUESTED'', ''BLOCKED'', ''FAILED'', ''COMPLETED'', ''SUBMITTED'') THEN
    RAISE EXCEPTION ''Invalid transition from ACTIVE to %'', NEW.state;
  ELSIF OLD.state = ''PAUSED'' AND NEW.state NOT IN (''ACTIVE'', ''CANCEL_REQUESTED'') THEN
    RAISE EXCEPTION ''Invalid transition from PAUSED to %'', NEW.state;
  ELSIF OLD.state = ''CANCEL_REQUESTED'' AND NEW.state NOT IN (''STOPPING'', ''CANCELLED'') THEN
    RAISE EXCEPTION ''Invalid transition from CANCEL_REQUESTED to %'', NEW.state;
  ELSIF OLD.state = ''STOPPING'' AND NEW.state NOT IN (''CANCELLED'', ''FAILED'') THEN
    RAISE EXCEPTION ''Invalid transition from STOPPING to %'', NEW.state;
  ELSIF OLD.state = ''BLOCKED'' AND NEW.state NOT IN (''ACTIVE'', ''CANCEL_REQUESTED'', ''FAILED'') THEN
    RAISE EXCEPTION ''Invalid transition from BLOCKED to %'', NEW.state;
  ELSIF OLD.state IN (''CANCELLED'', ''FAILED'', ''COMPLETED'', ''SUBMITTED'') THEN
    RAISE EXCEPTION ''Invalid transition from terminal state % to %'', OLD.state, NEW.state;
  END IF;

  RETURN NEW;
END;
86105 LANGUAGE plpgsql;
