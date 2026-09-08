import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/data/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - manifest.webmanifest (PWA manifest - Chrome fetches before session exists)
     * - storage/ (Supabase Storage proxy - public read cached responses)
     * - image files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|storage/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
