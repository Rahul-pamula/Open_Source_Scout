-- Add automation_count_today to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS automation_count_today INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_automation_date DATE DEFAULT CURRENT_DATE;

-- Create a function to increment automation count (resets automatically on a new day)
CREATE OR REPLACE FUNCTION increment_automation_count(user_id UUID, increment_by INT DEFAULT 1)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INT;
    last_date DATE;
BEGIN
    SELECT automation_count_today, last_automation_date INTO current_count, last_date
    FROM users WHERE id = user_id;

    IF last_date < CURRENT_DATE THEN
        -- Reset count if it's a new day
        current_count := 0;
        last_date := CURRENT_DATE;
    END IF;

    current_count := current_count + increment_by;

    UPDATE users 
    SET automation_count_today = current_count, last_automation_date = last_date
    WHERE id = user_id;

    RETURN current_count;
END;
$$;
