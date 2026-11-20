import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { sql } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import type { IStorage } from "./storage";
import type { AppDatabase } from "./db";
import { BookingError } from "./scheduling";

interface Mail {
  to: string;
  subject: string;
  text: string;
}
export type HttpClient = typeof fetch;
export const tokenDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function equalSecret(a: string, b: string) {
  const first = Buffer.from(a),
    second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export function minorUnits(amount: unknown): bigint {
  const value = String(amount);
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new BookingError("Invalid payment amount", 409);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export class Operations {
  readonly db?: AppDatabase;
  constructor(
    readonly storage: IStorage,
    readonly http: HttpClient = fetch,
  ) {
    if (storage.kind === "postgres")
      this.db = (storage as IStorage & { db: AppDatabase }).db;
  }
  private database() {
    if (!this.db)
      throw new BookingError("This workflow requires PostgreSQL", 503);
    return this.db;
  }
  emailReady() {
    return Boolean(
      this.db &&
      process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM &&
      process.env.SESSION_SECRET,
    );
  }
  paymentReady(providerId?: number) {
    return Boolean(
      this.db &&
      process.env.PAYCHANGU_SECRET_KEY &&
      ["test", "live"].includes(process.env.PAYCHANGU_MODE ?? "") &&
      /^\d+$/.test(process.env.PAYCHANGU_PROVIDER_ID ?? "") &&
      (!providerId || String(providerId) === process.env.PAYCHANGU_PROVIDER_ID),
    );
  }
  origin() {
    const origin = process.env.APP_ORIGIN;
    if (
      !origin ||
      new URL(origin).origin !== origin ||
      (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
    )
      throw new BookingError("Application origin is not configured", 503);
    return origin;
  }
  private key() {
    if (!process.env.SESSION_SECRET)
      throw new BookingError("Email security is not configured", 503);
    return createHash("sha256")
      .update("bookingpro-outbox-v1:")
      .update(process.env.SESSION_SECRET)
      .digest();
  }
  private seal(mail: Mail) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(mail), "utf8"),
      cipher.final(),
    ]);
    return {
      encrypted: [
        iv.toString("hex"),
        cipher.getAuthTag().toString("hex"),
        ciphertext.toString("hex"),
      ].join(":"),
    };
  }
  private open(payload: { encrypted: string }): Mail {
    const [iv, tag, data] = payload.encrypted.split(":"),
      cipher = createDecipheriv(
        "aes-256-gcm",
        this.key(),
        Buffer.from(iv, "hex"),
      );
    cipher.setAuthTag(Buffer.from(tag, "hex"));
    return JSON.parse(
      Buffer.concat([
        cipher.update(Buffer.from(data, "hex")),
        cipher.final(),
      ]).toString(),
    );
  }
  async authVersion(userId: string) {
    if (!this.db) return 0;
    const result = await this.db.execute(
      sql`select version from auth_credentials where user_id=${userId}`,
    );
    return result.rows.length ? Number(result.rows[0].version) : -1;
  }
  async issueReset(email: string) {
    if (!this.emailReady())
      throw new BookingError(
        "Password recovery is unavailable until email delivery is configured",
        503,
      );
    const db = this.database(),
      token = randomBytes(32).toString("hex"),
      digest = tokenDigest(token);
    // The bearer secret is in the URL fragment, so it is not sent in HTTP logs or referrers.
    const payload = this.seal({
      to: email,
      subject: "Reset your BookingPro password",
      text: `Use this link within 15 minutes to choose a new password:\n${this.origin()}/reset-password#${token}\n\nIgnore this message if you did not request it.`,
    });
    await db.transaction(async (tx) => {
      const result =
        await tx.execute(sql`insert into password_resets(token_hash,user_id,expires_at)
        select ${digest},u.id,now()+interval '15 minutes' from users u join auth_credentials c on c.user_id=u.id where u.email=${email} returning user_id`);
      if (result.rows.length)
        await tx.execute(
          sql`insert into message_outbox(dedupe_key,kind,payload,expires_at) values(${`reset:${digest}`},'password_reset',${JSON.stringify(payload)}::jsonb,now()+interval '15 minutes')`,
        );
    });
  }
  async resetValid(digest: string) {
    const result = await this.database().execute(
      sql`select 1 from password_resets where token_hash=${digest} and used_at is null and expires_at>now()`,
    );
    return Boolean(result.rows.length);
  }
  async consumeReset(digest: string, passwordHash: string) {
    return this.database().transaction(async (tx) => {
      const token = await tx.execute(
        sql`select user_id from password_resets where token_hash=${digest} and used_at is null and expires_at>now()`,
      );
      if (!token.rows.length)
        throw new BookingError("This reset link is invalid or expired", 400);
      const userId = String(token.rows[0].user_id);
      // Serialize all reset tokens for one account, including simultaneous different links.
      await tx.execute(
        sql`select user_id from auth_credentials where user_id=${userId} for update`,
      );
      const recheck = await tx.execute(
        sql`select 1 from password_resets where token_hash=${digest} and used_at is null and expires_at>now() for update`,
      );
      if (!recheck.rows.length)
        throw new BookingError("This reset link is invalid or expired", 400);
      await tx.execute(
        sql`update auth_credentials set password_hash=${passwordHash},version=version+1 where user_id=${userId}`,
      );
      await tx.execute(
        sql`update password_resets set used_at=now() where user_id=${userId} and used_at is null`,
      );
      await tx.execute(
        sql`delete from sessions where sess->>'userId'=${userId}`,
      );
      const user = await tx.execute(
        sql`select email from users where id=${userId}`,
      );
      if (user.rows[0]?.email) {
        const payload = this.seal({
          to: String(user.rows[0].email),
          subject: "Your BookingPro password changed",
          text: "Your password was changed and existing sign-in sessions were revoked. If this was not you, reset your password immediately and contact your email provider.",
        });
        await tx.execute(
          sql`insert into message_outbox(dedupe_key,kind,payload) values(${`password-changed:${digest}`},'password_changed',${JSON.stringify(payload)}::jsonb)`,
        );
      }
    });
  }
  backgroundDelivery() {
    if (!this.emailReady()) return;
    // Vercel keeps this bounded delivery attempt alive after the response. The
    // transactional outbox remains the source of truth after timeout/restart.
    const delivery = this.deliver(2).catch(() =>
      console.error("Message dispatch deferred"),
    );
    if (process.env.VERCEL) waitUntil(delivery);
  }
  async queueReminders() {
    await this.database()
      .execute(sql`insert into message_outbox(dedupe_key,kind,provider_id,appointment_id,payload,expires_at)
      select 'reminder:'||a.id||':'||a.message_version, 'reminder',a.provider_id,a.id,
      jsonb_build_object('version',a.message_version,'revision',booking_message_revision(a),'to',a.client_email,'name',a.client_name,'date',a.appointment_date,'start',a.start_time,'end',a.end_time,'status',a.status,'provider',p.name,'service',s.name),
      (a.starts_at at time zone 'Africa/Blantyre')
      from appointments a join providers p on p.id=a.provider_id join services s on s.id=a.service_id
      where a.status in ('confirmed','pending') and a.starts_at at time zone 'Africa/Blantyre'>now() and a.starts_at at time zone 'Africa/Blantyre'<now()+interval '25 hours'
      on conflict(dedupe_key) do nothing`);
  }
  async deliver(limit = 10) {
    if (!this.emailReady())
      return { accepted: 0, failed: 0, configured: false };
    const db = this.database();
    let accepted = 0,
      failed = 0;
    let next = 0;
    const worker = async () => {
      while (next++ < limit) {
        const lease = randomUUID();
        const result =
          await db.execute(sql`update message_outbox set status='processing',lease_id=${lease}::uuid,lease_until=now()+interval '60 seconds',attempts=attempts+1
        where id=(select id from message_outbox where ((status='pending' and available_at<=now()) or (status='processing' and lease_until<now())) and expires_at>now() and attempts<5 order by case when kind='password_reset' then 0 else 1 end,created_at for update skip locked limit 1) returning *`);
        const row = result.rows[0] as any;
        if (!row) break;
        try {
          let mail: Mail;
          if (
            row.kind === "password_reset" ||
            row.kind === "password_changed"
          ) {
            if (
              row.kind === "password_reset" &&
              !(await this.resetValid(row.dedupe_key.slice(6)))
            ) {
              await db.execute(
                sql`update message_outbox set status='skipped',payload='{}'::jsonb where id=${row.id}::uuid and lease_id=${lease}::uuid`,
              );
              continue;
            }
            mail = this.open(row.payload);
          } else {
            const current = await db.execute(
              sql`select message_version from appointments a where id=${row.appointment_id}`,
            );
            if (
              Number(current.rows[0]?.message_version) !== row.payload.version
            ) {
              await db.execute(
                sql`update message_outbox set status='skipped' where id=${row.id}::uuid and lease_id=${lease}::uuid`,
              );
              continue;
            }
            const p = row.payload;
            mail = {
              to: p.to,
              subject:
                row.kind === "reminder"
                  ? "Your appointment reminder"
                  : `Appointment ${p.status}`,
              text: `Hello ${p.name},\n\n${p.service} with ${p.provider}\n${p.date}, ${p.start}–${p.end} CAT (Malawi)\nStatus: ${p.status}\nBooking #${row.appointment_id}\n\nContact your professional for changes or questions.`,
            };
          }
          const response = await this.http("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `bookingpro/${row.id}`,
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM,
              to: [mail.to],
              subject: mail.subject,
              text: mail.text,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`email_http_${response.status}`);
          const body = await response.json();
          if (typeof body.id !== "string")
            throw new Error("email_response_invalid");
          // Accepted is intentionally not described as inbox-delivered.
          await db.execute(
            sql`update message_outbox set status='sent',accepted_id=${body.id},sent_at=now(),last_error=null,payload=case when kind in ('password_reset','password_changed') then '{}'::jsonb else payload end where id=${row.id}::uuid and lease_id=${lease}::uuid`,
          );
          accepted++;
        } catch {
          await db.execute(
            sql`update message_outbox set status=case when attempts>=5 then 'failed' else 'pending' end,available_at=now()+interval '5 minutes',last_error='Delivery failed; retry scheduled' where id=${row.id}::uuid and lease_id=${lease}::uuid`,
          );
          failed++;
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(limit, 4) }, () => worker()),
    );
    await db.execute(
      sql`update message_outbox set status='failed',payload=case when kind in ('password_reset','password_changed') then '{}'::jsonb else payload end,last_error='Retry window expired' where status in ('pending','processing') and expires_at<=now()`,
    );
    return { accepted, failed, configured: true };
  }
  async createCheckout(appointmentId: number) {
    const a = await this.storage.getAppointment(appointmentId);
    if (!a || !this.paymentReady(a.providerId))
      throw new BookingError(
        "Online payment is not configured for this professional",
        503,
      );
    if (a.status === "cancelled" || a.paymentStatus === "completed")
      throw new BookingError("This booking cannot start another payment", 409);
    if (minorUnits(a.paymentAmount ?? "0") <= 0n)
      throw new BookingError("This booking has no payable amount", 409);
    const mode = process.env.PAYCHANGU_MODE!;
    const inserted = await this.database().execute(
      sql`insert into payment_intents(appointment_id,tx_ref,amount,mode) values(${a.id},${`bp-${randomUUID()}`},${a.paymentAmount!},${mode}) on conflict(appointment_id,mode) do update set appointment_id=excluded.appointment_id returning *`,
    );
    const intent = inserted.rows[0] as any;
    if (intent.checkout_url)
      return {
        checkoutUrl: intent.checkout_url,
        reference: intent.tx_ref,
        mode,
      };
    const claimed = await this.database().execute(
      sql`update payment_intents set checkout_locked_until=now()+interval '30 seconds' where id=${intent.id}::uuid and (checkout_locked_until is null or checkout_locked_until<now()) returning id`,
    );
    if (!claimed.rows.length)
      throw new BookingError(
        "Payment setup is in progress. Retry shortly.",
        409,
      );
    const callback = `${this.origin()}/payment-return`;
    const response = await this.http("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        tx_ref: intent.tx_ref,
        amount: intent.amount,
        currency: "MWK",
        email: a.clientEmail,
        first_name: a.clientName,
        callback_url: callback,
        return_url: callback,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new BookingError(
        "Payment provider is unavailable. Retry shortly.",
        502,
      );
    const body = await response.json();
    const url = new URL(body.data?.checkout_url ?? "https://invalid.invalid");
    if (
      body.status !== "success" ||
      url.protocol !== "https:" ||
      !(
        mode === "test"
          ? ["test-checkout.paychangu.com", "checkout.paychangu.com"]
          : ["checkout.paychangu.com"]
      ).includes(url.hostname)
    )
      throw new BookingError(
        "Payment provider returned an invalid checkout",
        502,
      );
    await this.database().execute(
      sql`update payment_intents set checkout_url=${url.href},checkout_locked_until=null where id=${intent.id}::uuid`,
    );
    return { checkoutUrl: url.href, reference: intent.tx_ref, mode };
  }
  async verifyPayment(reference: string) {
    const result = await this.database().execute(
      sql`select i.*,a.provider_id from payment_intents i join appointments a on a.id=i.appointment_id where tx_ref=${reference}`,
    );
    const intent = result.rows[0] as any;
    if (!intent) throw new BookingError("Payment reference not found", 404);
    if (
      !this.paymentReady(intent.provider_id) ||
      intent.mode !== process.env.PAYCHANGU_MODE
    )
      throw new BookingError(
        "Payment verification is not configured for this merchant",
        503,
      );
    if (intent.status !== "pending")
      return {
        status: intent.status,
        appointmentId: intent.appointment_id,
        mode: intent.mode,
      };
    const response = await this.http(
      `https://api.paychangu.com/verify-payment/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new BookingError(
        "Payment verification is temporarily unavailable",
        502,
      );
    const body = await response.json(),
      data = body.data;
    if (
      body.status !== "success" ||
      !data ||
      data.tx_ref !== reference ||
      data.currency !== intent.currency ||
      data.mode !== intent.mode ||
      minorUnits(data.amount) !== minorUnits(intent.amount)
    )
      throw new BookingError("Payment details do not match this booking", 409);
    if (data.status !== "success")
      return {
        status: "pending",
        appointmentId: intent.appointment_id,
        mode: intent.mode,
      };
    if (
      !data.reference ||
      typeof data.reference !== "string" ||
      data.reference.length > 200
    )
      throw new BookingError("Payment evidence is incomplete", 409);
    await this.database().transaction(async (tx) => {
      await tx.execute(
        sql`select id from payment_intents where id=${intent.id}::uuid for update`,
      );
      const a = await tx.execute(
        sql`select payment_amount from appointments where id=${intent.appointment_id} for update`,
      );
      if (
        !a.rows[0] ||
        minorUnits(a.rows[0].payment_amount) !== minorUnits(intent.amount)
      )
        throw new BookingError(
          "Booking value changed; reconcile this payment manually",
          409,
        );
      await tx.execute(
        sql`update payment_intents set status=${intent.mode === "live" ? "paid" : "verified_test"},gateway_reference=${data.reference},verified_at=now() where id=${intent.id}::uuid and status='pending'`,
      );
      if (intent.mode === "live")
        await tx.execute(
          sql`update appointments set payment_status='completed' where id=${intent.appointment_id}`,
        );
    });
    return {
      status: intent.mode === "live" ? "paid" : "verified_test",
      appointmentId: intent.appointment_id,
      mode: intent.mode,
    };
  }
  async dashboard(providerId: number) {
    if (!this.db)
      return {
        emailConfigured: false,
        paymentConfigured: false,
        messages: [],
        payments: [],
      };
    const [messages, payments] = await Promise.all([
      this.db.execute(
        sql`select id,kind,status,attempts,last_error,created_at,sent_at,appointment_id from message_outbox where provider_id=${providerId} order by created_at desc limit 100`,
      ),
      this.db.execute(
        sql`select i.tx_ref,i.appointment_id,i.amount,i.currency,i.mode,i.status,i.gateway_reference,i.verified_at from payment_intents i join appointments a on a.id=i.appointment_id where a.provider_id=${providerId} order by i.created_at desc limit 100`,
      ),
    ]);
    return {
      emailConfigured: this.emailReady(),
      paymentConfigured: this.paymentReady(providerId),
      paymentMode: this.paymentReady(providerId)
        ? process.env.PAYCHANGU_MODE
        : null,
      messages: messages.rows,
      payments: payments.rows,
    };
  }
  validWebhook(body: Buffer, signature: string) {
    if (
      !process.env.PAYCHANGU_WEBHOOK_SECRET ||
      !/^[a-f0-9]{64}$/i.test(signature)
    )
      return false;
    return equalSecret(
      createHmac("sha256", process.env.PAYCHANGU_WEBHOOK_SECRET)
        .update(body)
        .digest("hex"),
      signature.toLowerCase(),
    );
  }
}
