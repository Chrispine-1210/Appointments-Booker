import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { randomBytes } from "node:crypto";
import { storage } from "./storage";

// Check if running in Replit environment
const isReplitEnvironment = Boolean(process.env.REPLIT_DOMAINS && process.env.REPL_ID);
const developmentSecret = randomBytes(32).toString("hex");

export function authenticatedUserId(req: Parameters<RequestHandler>[0]): string | undefined {
  const user = req.user as { claims?: { sub?: string }; expires_at?: number } | undefined;
  if (!req.isAuthenticated?.() || !user?.claims?.sub || !user.expires_at || user.expires_at <= Date.now() / 1000) {
    return undefined;
  }
  return user.claims.sub;
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  const production = process.env.NODE_ENV === "production";
  if (production && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.DATABASE_URL)) {
    throw new Error("Production authentication requires DATABASE_URL and a SESSION_SECRET of at least 32 characters.");
  }
  const PgStore = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET || developmentSecret,
    ...(production ? { store: new PgStore({ conString: process.env.DATABASE_URL, tableName: "sessions", createTableIfMissing: false }) } : {}),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: production || isReplitEnvironment,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  if (!isReplitEnvironment) {
    app.get("/api/login", (_req, res) => {
      res.status(503).json({ message: "Sign-in is not configured. Set REPL_ID and REPLIT_DOMAINS to enable authentication." });
    });
    app.get("/api/logout", (_req, res) => res.redirect("/"));
    return;
  }
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Logout route - works in both development and production
  app.get("/api/logout", (req, res) => {
    // Destroy session directly
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      
      // In development mode, just redirect to home
      if (!isReplitEnvironment) {
        return res.redirect("/");
      }
      
      // In production, redirect through Replit's logout endpoint
      (async () => {
        try {
          const config = await getOidcConfig();
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        } catch (error) {
          res.redirect("/");
        }
      })();
    });
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      verified(error as Error);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated?.() || !user?.claims?.sub || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    if (tokenResponse.claims()?.sub !== user.claims.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
