ALTER TABLE auth_credentials ADD COLUMN version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
--> statement-breakpoint
CREATE INDEX password_resets_user_idx ON password_resets(user_id);
--> statement-breakpoint
CREATE TABLE message_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK(kind IN ('password_reset','password_changed','appointment','reminder')),
  provider_id integer REFERENCES providers(id),
  appointment_id integer REFERENCES appointments(id),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '23 hours',
  lease_id uuid,
  lease_until timestamptz,
  accepted_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
--> statement-breakpoint
CREATE INDEX message_outbox_pending_idx ON message_outbox(available_at) WHERE status IN ('pending','processing');
--> statement-breakpoint
CREATE FUNCTION booking_message_revision(a appointments) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT concat_ws('|', a.appointment_date, a.start_time, a.end_time, a.status, a.client_email)
$$;
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN message_version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE FUNCTION advance_booking_message_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF booking_message_revision(NEW) <> booking_message_revision(OLD) THEN
  NEW.message_version := OLD.message_version + 1;
 ELSE NEW.message_version := OLD.message_version;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER appointment_message_version BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION advance_booking_message_version();
--> statement-breakpoint
CREATE FUNCTION enqueue_booking_message() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE snapshot jsonb; revision text;
BEGIN
 revision := booking_message_revision(NEW);
 IF TG_OP = 'UPDATE' AND revision = booking_message_revision(OLD) THEN RETURN NEW; END IF;
 SELECT jsonb_build_object('version', NEW.message_version, 'revision', revision, 'to', NEW.client_email, 'name', NEW.client_name,
   'date', NEW.appointment_date, 'start', NEW.start_time, 'end', NEW.end_time, 'status', NEW.status,
   'provider', p.name, 'service', s.name)
 INTO snapshot FROM providers p JOIN services s ON s.id = NEW.service_id WHERE p.id = NEW.provider_id;
 INSERT INTO message_outbox(dedupe_key,kind,provider_id,appointment_id,payload)
 VALUES('appointment:' || NEW.id || ':' || NEW.message_version, 'appointment',NEW.provider_id,NEW.id,snapshot)
 ON CONFLICT(dedupe_key) DO NOTHING;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER appointment_message_outbox AFTER INSERT OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION enqueue_booking_message();
--> statement-breakpoint
CREATE TABLE payment_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id integer NOT NULL REFERENCES appointments(id),
 tx_ref text NOT NULL UNIQUE,
 amount numeric(10,2) NOT NULL CHECK(amount > 0),
 currency text NOT NULL DEFAULT 'MWK' CHECK(currency = 'MWK'),
 mode text NOT NULL CHECK(mode IN ('test','live')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified_test','paid')),
 checkout_url text,
 checkout_locked_until timestamptz,
 gateway_reference text UNIQUE,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(appointment_id, mode)
);
