import type { RequestHandler } from "express";
import type { IStorage } from "./storage";
import { authenticatedUserId } from "./replitAuth";

export function positiveId(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  if (!/^[1-9]\d*$/.test(String(value))) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

export function providerAccess(store: IStorage, source: "params" | "body", key: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const id = positiveId(req[source]?.[key]);
      if (!id) return res.status(400).json({ message: "Invalid provider ID" });
      const provider = await store.getProvider(id);
      if (!provider || !provider.ownerUserId || provider.ownerUserId !== authenticatedUserId(req)) {
        return res.status(403).json({ message: "Provider access denied" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function recordAccess(store: IStorage, kind: "Appointment" | "Memo" | "Task"): RequestHandler {
  return async (req, res, next) => {
    try {
      const id = positiveId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid record ID" });
      const record = await store[`get${kind}`](id);
      if (!record) return res.status(404).json({ message: "Record not found" });
      const provider = await store.getProvider(record.providerId);
      if (!provider?.ownerUserId || provider.ownerUserId !== authenticatedUserId(req)) {
        return res.status(403).json({ message: "Provider access denied" });
      }
      if (req.body?.providerId !== undefined && req.body.providerId !== record.providerId) {
        return res.status(400).json({ message: "A record cannot be transferred to another provider" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const sameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (req.get("sec-fetch-site") === "cross-site" || (origin && origin !== `${req.protocol}://${req.get("host")}`)) {
    return res.status(403).json({ message: "Cross-origin writes are not allowed" });
  }
  next();
};
