import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;

  // Redirect to strapex.org if it's the root page, accounts, or dashboard
  /*
  if (url === '/' || url === '/accounts' || url === '/dashboard') {
    return NextResponse.redirect('https://strapex.org');
  }
  */

  // Allow access to all other routes
  return NextResponse.next();
}

// Specify the routes where the middleware should run
export const config = {
  matcher: ["/:path*"],
};
