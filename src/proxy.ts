import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Only page routes get the HTML redirect-to-login treatment. API routes
// each carry their own auth() check and return a proper JSON 401 — routing
// them through here too would redirect fetch() calls to the login *page*
// instead, breaking every dashboard component's response.json() parsing.
// The Mercado Pago webhook in particular must stay unauthenticated at this
// layer entirely: it's called by Mercado Pago's servers, not a signed-in
// user, and is protected by its own HMAC signature check instead.
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
