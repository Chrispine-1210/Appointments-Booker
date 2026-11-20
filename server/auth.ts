import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import session from "express-session";
import type { Express, Request, RequestHandler } from "express";
import { z } from "zod";
import type { IStorage } from "./storage";
import { BookingError } from "./scheduling";
import { Operations, tokenDigest } from "./operations";
import { setTimeout as delay } from "node:timers/promises";

const developmentSecret = randomBytes(32).toString("hex");
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const dummyHash = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
let activeHashes = 0;

declare module "express-session" {
  interface SessionData {
    userId?: string;
    bookingIds?: number[];
    authVersion?: number;
  }
}

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();
const registrationSchema = loginSchema.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
});

async function derive(password: string, salt: string) {
  if (activeHashes >= 4)
    throw new BookingError("Sign-in is busy. Please retry shortly.", 429);
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scryptCallback(
        password,
        salt,
        64,
        { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
        (error, result) => (error ? reject(error) : resolve(result)),
      ),
    );
  } finally {
    activeHashes--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [version, salt, encoded] = hash.split(":");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(encoded ?? "")
  )
    return false;
  const result = await derive(password, salt);
  return timingSafeEqual(result, Buffer.from(encoded, "hex"));
}

export function authenticatedUserId(req: Request): string | undefined {
  if (req.session?.userId) return req.session.userId;
  // The injected regression adapter uses Passport-shaped identities. Production
  // attaches these from the authenticated session, never from request headers.
  const principal = req.user as
    { claims?: { sub?: string }; expires_at?: number } | undefined;
  return req.isAuthenticated?.() &&
    principal?.claims?.sub &&
    Number(principal.expires_at) > Date.now() / 1000
    ? principal.claims.sub
    : undefined;
}
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!authenticatedUserId(req))
    return res.status(401).json({ message: "Unauthorized" });
  next();
};

export function authConfiguration(storage: IStorage) {
  const production = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET || developmentSecret;
  if (production) {
    if (!process.env.SESSION_SECRET || secret.length < 32)
      throw new Error(
        "SESSION_SECRET must contain at least 32 characters in production",
      );
    const origin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN)
      : undefined;
    if (
      !origin ||
      origin.protocol !== "https:" ||
      origin.origin !== process.env.APP_ORIGIN
    )
      throw new Error(
        "APP_ORIGIN must be an HTTPS origin without a path in production",
      );
    if (storage.kind !== "postgres" || !storage.sessionStore)
      throw new Error(
        "Production login requires PostgreSQL records and sessions",
      );
  }
  return {
    secret,
    secure: production,
    enabled:
      storage.kind === "postgres" || process.env.NODE_ENV !== "production",
  };
}

export async function setupAuth(
  app: Express,
  storage: IStorage,
  operations = new Operations(storage),
) {
  const config = authConfiguration(storage);
  app.use(
    session({
      name: "booking.sid",
      secret: config.secret,
      store: storage.sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secure,
        maxAge: sessionLifetime,
      },
    }),
  );
  app.use((req, _res, next) => {
    void (async () => {
      if (req.session.userId) {
        if (
          (req.session.authVersion ?? 0) !==
          (await operations.authVersion(req.session.userId))
        ) {
          await new Promise<void>((resolve, reject) =>
            req.session.destroy((error) => (error ? reject(error) : resolve())),
          );
          return next();
        }
        req.user = {
          claims: { sub: req.session.userId },
          expires_at: Math.floor(Date.now() / 1000) + sessionLifetime / 1000,
        } as Express.User;
        req.isAuthenticated = (() => true) as typeof req.isAuthenticated;
      }
      next();
    })().catch(next);
  });
  const route =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  const limit = async (
    req: Request,
    purpose: string,
    email: string,
    registrations = false,
  ) => {
    const digest = (value: string) =>
      createHmac("sha256", config.secret).update(value).digest("hex");
    const window = registrations ? 60 * 60 * 1000 : 15 * 60 * 1000;
    const ipAllowed = await storage.consumeAuthAttempt(
      `${purpose}:ip:${digest(req.ip ?? "unknown")}`,
      window,
      registrations ? 5 : 30,
    );
    const accountAllowed =
      ipAllowed &&
      (await storage.consumeAuthAttempt(
        `${purpose}:account:${digest(email)}`,
        window,
        registrations ? 3 : 10,
      ));
    if (!accountAllowed)
      throw new BookingError("Too many attempts. Please try again later.", 429);
  };
  const establishSession = async (
    req: Request,
    userId: string,
    version?: number,
  ) => {
    const bookings = req.session.bookingIds;
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    );
    req.session.userId = userId;
    req.session.authVersion = version ?? (await operations.authVersion(userId));
    if (bookings) req.session.bookingIds = bookings;
    await new Promise<void>((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    );
  };
  app.get("/api/login", (_req, res) => res.redirect("/login"));
  app.post(
    "/api/auth/register",
    route(async (req, res) => {
      const data = registrationSchema.parse(req.body);
      await limit(req, "register", data.email, true);
      const user = await storage.registerUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: await hashPassword(data.password),
      });
      await establishSession(req, user.id);
      res.set("Cache-Control", "no-store").status(201).json(user);
    }),
  );
  app.post(
    "/api/auth/login",
    route(async (req, res) => {
      const data = loginSchema.parse(req.body);
      await limit(req, "login", data.email);
      const credential = await storage.getCredential(data.email);
      const matches = await verifyPassword(
        data.password,
        credential?.passwordHash ?? dummyHash,
      );
      if (!credential || !matches)
        return res.status(401).json({ message: "Invalid email or password" });
      if (
        (await operations.authVersion(credential.userId)) !== credential.version
      )
        return res.status(401).json({ message: "Invalid email or password" });
      const user = await storage.getUser(credential.userId);
      if (!user)
        return res.status(401).json({ message: "Invalid email or password" });
      await establishSession(req, user.id, credential.version);
      res.set("Cache-Control", "no-store").json(user);
    }),
  );
  app.post(
    "/api/auth/logout",
    route(async (req, res) => {
      await new Promise<void>((resolve, reject) =>
        req.session.destroy((error) => (error ? reject(error) : resolve())),
      );
      res
        .clearCookie("booking.sid", {
          httpOnly: true,
          secure: config.secure,
          sameSite: "lax",
        })
        .status(204)
        .send();
    }),
  );
  app.get("/api/logout", (_req, res) => res.redirect("/login"));
  app.post(
    "/api/auth/forgot-password",
    route(async (req, res) => {
      const started = Date.now();
      const data = loginSchema.pick({ email: true }).parse(req.body);
      await limit(req, "recovery", data.email, true);
      await operations.issueReset(data.email);
      // Queueing and response are independent of delivery and use one public message.
      await delay(
        Math.max(
          0,
          650 - (Date.now() - started) + Math.floor(Math.random() * 50),
        ),
      );
      res.set("Cache-Control", "no-store").json({
        message:
          "If an account exists for this email, a reset link will be sent. Check your inbox and spam folder.",
      });
      operations.backgroundDelivery();
    }),
  );
  app.post(
    "/api/auth/reset-password",
    route(async (req, res) => {
      const data = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(12).max(128),
        })
        .strict()
        .parse(req.body);
      await limit(req, "reset", tokenDigest(data.token));
      const digest = tokenDigest(data.token);
      if (!(await operations.resetValid(digest)))
        throw new BookingError("This reset link is invalid or expired", 400);
      await operations.consumeReset(digest, await hashPassword(data.password));
      await new Promise<void>((resolve, reject) =>
        req.session.destroy((error) => (error ? reject(error) : resolve())),
      );
      res
        .clearCookie("booking.sid", {
          httpOnly: true,
          secure: config.secure,
          sameSite: "lax",
        })
        .set("Cache-Control", "no-store")
        .json({ message: "Password updated. Sign in with your new password." });
      operations.backgroundDelivery();
    }),
  );
}
