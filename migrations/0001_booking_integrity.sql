-- DB-level exclusion is essential: application-only checks cannot protect
-- independent processes. Adjacent half-open intervals remain bookable.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
UPDATE appointments SET starts_at = (appointment_date || ' ' || start_time)::timestamp,
  ends_at = (appointment_date || ' ' || end_time)::timestamp;
--> statement-breakpoint
ALTER TABLE appointments ADD CONSTRAINT appointments_valid_status CHECK (status IN ('pending','confirmed','cancelled','completed')),
  ADD CONSTRAINT appointments_valid_interval CHECK (ends_at > starts_at),
  ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist
  (provider_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status <> 'cancelled');
--> statement-breakpoint
ALTER TABLE services ADD CONSTRAINT services_valid_duration CHECK (duration BETWEEN 1 AND 720),
  ADD CONSTRAINT services_valid_price CHECK (price >= 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION booking_validate_interval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p providers%ROWTYPE; s services%ROWTYPE;
BEGIN
  IF NEW.appointment_date !~ '^\d{4}-\d{2}-\d{2}$' OR NEW.start_time !~ '^([01]\d|2[0-3]):[0-5]\d$' OR NEW.end_time !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'Invalid date/time format' USING ERRCODE='23514';
  END IF;
  NEW.starts_at := (NEW.appointment_date || ' ' || NEW.start_time)::timestamp;
  NEW.ends_at := (NEW.appointment_date || ' ' || NEW.end_time)::timestamp;
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'Invalid interval' USING ERRCODE='23514'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.provider_id <> OLD.provider_id OR NEW.client_user_id IS DISTINCT FROM OLD.client_user_id THEN
      RAISE EXCEPTION 'Booking ownership is immutable' USING ERRCODE='23514';
    END IF;
    IF (NEW.provider_id, NEW.service_id, NEW.appointment_date, NEW.start_time, NEW.end_time) IS NOT DISTINCT FROM
       (OLD.provider_id, OLD.service_id, OLD.appointment_date, OLD.start_time, OLD.end_time)
       AND NOT (OLD.status = 'cancelled' AND NEW.status <> 'cancelled') THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO p FROM providers WHERE id = NEW.provider_id FOR SHARE;
  SELECT * INTO s FROM services WHERE id = NEW.service_id AND provider_id = NEW.provider_id FOR SHARE;
  IF NOT FOUND OR NOT s.is_active OR NOT p.is_active OR p.working_hours IS NULL
    OR extract(epoch FROM (NEW.ends_at - NEW.starts_at))/60 <> s.duration THEN
    RAISE EXCEPTION 'Invalid provider service or duration' USING ERRCODE='23514';
  END IF;
  IF NEW.status <> 'cancelled' AND (
    NOT (p.working_hours->'days' @> to_jsonb(extract(dow FROM NEW.starts_at)::integer))
    OR NEW.start_time < p.working_hours->>'start' OR NEW.end_time > p.working_hours->>'end'
  ) THEN RAISE EXCEPTION 'Outside provider hours' USING ERRCODE='23514'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.payment_amount := s.price; NEW.payment_status := 'pending'; NEW.stripe_payment_id := NULL;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER appointments_validate BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION booking_validate_interval();
--> statement-breakpoint
CREATE UNIQUE INDEX users_email_casefold_unique ON users(lower(email));
--> statement-breakpoint
CREATE INDEX auth_attempts_expiry_idx ON auth_attempts(expires_at);
--> statement-breakpoint
CREATE TABLE booking_schema_version (id integer PRIMARY KEY CHECK (id = 1), version integer NOT NULL);
--> statement-breakpoint
INSERT INTO booking_schema_version (id, version) VALUES (1, 1);
