-- Relax the state transition guard for execution model to allow backward reversions
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions for the new execution model, including reversions
  IF OLD.state = 'QUEUED' AND NEW.state NOT IN ('ACTIVE', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid transition from QUEUED to %', NEW.state;
  ELSIF OLD.state = 'ACTIVE' AND NEW.state NOT IN ('PAUSED', 'CANCEL_REQUESTED', 'BLOCKED', 'FAILED', 'COMPLETED', 'SUBMITTED', 'QUEUED') THEN
    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.state;
  ELSIF OLD.state = 'PAUSED' AND NEW.state NOT IN ('ACTIVE', 'CANCEL_REQUESTED', 'QUEUED') THEN
    RAISE EXCEPTION 'Invalid transition from PAUSED to %', NEW.state;
  ELSIF OLD.state = 'CANCEL_REQUESTED' AND NEW.state NOT IN ('STOPPING', 'CANCELLED', 'ACTIVE') THEN
    RAISE EXCEPTION 'Invalid transition from CANCEL_REQUESTED to %', NEW.state;
  ELSIF OLD.state = 'STOPPING' AND NEW.state NOT IN ('CANCELLED', 'FAILED') THEN
    RAISE EXCEPTION 'Invalid transition from STOPPING to %', NEW.state;
  ELSIF OLD.state = 'BLOCKED' AND NEW.state NOT IN ('ACTIVE', 'CANCEL_REQUESTED', 'FAILED', 'QUEUED') THEN
    RAISE EXCEPTION 'Invalid transition from BLOCKED to %', NEW.state;
  ELSIF OLD.state = 'CANCELLED' AND NEW.state NOT IN ('QUEUED') THEN
    RAISE EXCEPTION 'Invalid transition from CANCELLED to %', NEW.state;
  ELSIF OLD.state = 'FAILED' AND NEW.state NOT IN ('QUEUED', 'ACTIVE') THEN
    RAISE EXCEPTION 'Invalid transition from FAILED to %', NEW.state;
  ELSIF OLD.state = 'COMPLETED' AND NEW.state NOT IN ('ACTIVE') THEN
    RAISE EXCEPTION 'Invalid transition from COMPLETED to %', NEW.state;
  ELSIF OLD.state = 'SUBMITTED' AND NEW.state NOT IN ('ACTIVE') THEN
    RAISE EXCEPTION 'Invalid transition from SUBMITTED to %', NEW.state;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
