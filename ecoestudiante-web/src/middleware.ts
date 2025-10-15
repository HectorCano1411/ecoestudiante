import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // protege todo excepto login, estáticos y la API de auth
    "/((?!login|_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
