import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Adds baseline security headers to every response.
// Content-Security-Policy is intentionally omitted here: the app uses data: URIs
// for images stored in localStorage and loads fonts from Google Fonts CDN, so a
// correct CSP requires a full origin inventory before it can be deployed safely.
// Add CSP in a dedicated PR after auditing all allowed origins.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  // Prevent this page from being embedded in iframes (clickjacking).
  setResponseHeader("x-frame-options", "DENY");
  // Prevent MIME-type sniffing on responses.
  setResponseHeader("x-content-type-options", "nosniff");
  // Control how much referrer info is sent to external origins.
  setResponseHeader("referrer-policy", "strict-origin-when-cross-origin");
  // Restrict access to browser features that this app does not use.
  setResponseHeader(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// requestMiddleware runs on every request; functionMiddleware only on server functions, where
// client sendContext is unvalidated input. Append to these arrays, never replace them.
// Enabling Lovable Cloud adds functionMiddleware: [attachSupabaseAuth], the bearer token that
// requireSupabaseAuth server functions need. Add it by hand only if Lovable Cloud or a
// user-managed Supabase project is connected, no middleware here sets Authorization, and the
// project did not intentionally replace it.
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware, csrfMiddleware],
}));
