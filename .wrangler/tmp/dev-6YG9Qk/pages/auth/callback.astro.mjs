globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as createAstro } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { c as createSupabaseServerInstance } from '../../chunks/supabase.client_RZyWin4j.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const $$Astro = createAstro();
const prerender = false;
const $$Callback = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Callback;
  const url = new URL(Astro2.request.url);
  const tokenHash = url.hash.slice(1);
  const searchParams = new URLSearchParams(tokenHash || url.search);
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  if (error) {
    console.error("[Auth Callback] Error from Supabase:", error, errorDescription);
    return Astro2.redirect(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
  }
  if (accessToken && refreshToken) {
    const supabase = createSupabaseServerInstance({
      cookies: Astro2.cookies,
      headers: Astro2.request.headers
    });
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError) {
      console.error("[Auth Callback] Failed to set session:", sessionError);
      return Astro2.redirect(
        `/auth/login?error=${encodeURIComponent("Failed to verify your account. Please try again.")}`
      );
    }
    if (type === "recovery") {
      return Astro2.redirect("/auth/reset-password");
    } else if (type === "signup") {
      return Astro2.redirect("/dashboard");
    } else {
      return Astro2.redirect("/dashboard");
    }
  }
  console.error("[Auth Callback] No tokens found in URL");
  return Astro2.redirect("/auth/login?error=" + encodeURIComponent("Invalid confirmation link"));
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/callback.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/callback.astro";
const $$url = "/auth/callback";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Callback,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
