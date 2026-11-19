export {};
declare global {
  namespace Express {
    interface User { claims?: { sub?: string }; expires_at?: number; }
    interface Request { user?: User; isAuthenticated?: () => boolean; }
  }
}
