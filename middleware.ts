import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("sisconta_token")?.value;

  // Si el usuario está autenticado y trata de ir a login, redirigir a dashboard
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Si el usuario NO está autenticado y trata de acceder a rutas protegidas
  if (!token && (pathname === "/admin" || pathname === "/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Ruta raíz siempre va a login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Dejar pasar las demás rutas (públicas)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
