
-- Drop ONLY the COGS expense trigger so job completion does NOT cause an insert into 'expenses'.
DROP TRIGGER IF EXISTS job_completion_cogs_trigger ON job_cards;

-- (Optional) You may re-enable or fix this trigger/policy in the future for full expense tracking.
