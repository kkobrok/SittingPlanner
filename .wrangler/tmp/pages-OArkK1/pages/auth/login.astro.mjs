globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, g as renderScript } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../../chunks/AppShell_Da3zkd3O.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const prerender = false;
const $$Login = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Login" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg border border-white/40"> <h1 class="text-2xl font-bold mb-4 text-gray-900">Sign In</h1> <p class="text-sm text-gray-600 mb-6">Welcome back! Sign in to your account to continue.</p> <form id="loginForm" class="space-y-4" method="post" data-testid="login-form"> <div> <label for="email" class="block text-sm font-medium text-gray-700">Email</label> <input id="email" name="email" type="email" required autocomplete="email" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="your@email.com" data-testid="email-input"> </div> <div> <div class="flex items-center justify-between mb-1"> <label for="password" class="block text-sm font-medium text-gray-700">Password</label> <a href="/auth/forgot-password" class="text-sm text-pink-600 hover:text-pink-700 font-medium" data-testid="forgot-password-link">
Forgot password?
</a> </div> <div class="relative"> <input id="password" name="password" type="password" required autocomplete="current-password" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="••••••••" data-testid="password-input"> <button type="button" id="togglePassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Toggle password visibility"> <svg id="eyeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path> </svg> <svg id="eyeOffIcon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path> </svg> </button> </div> </div> <button type="submit" id="submitBtn" class="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed" data-testid="submit-button"> <span id="submitText">Sign In</span> <span id="submitLoading" class="hidden">Signing in...</span> </button> <p id="loginStatus" class="text-sm text-red-600 hidden" role="alert" aria-live="polite" data-testid="login-error-message"></p> </form> <div class="mt-6 text-center"> <p class="text-sm text-gray-600">
Don't have an account?
<a href="/auth/register" class="text-pink-600 hover:text-pink-700 font-semibold" data-testid="sign-up-link">
Sign up
</a> </p> </div> </div> ${renderScript($$result2, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/login.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/login.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/login.astro";
const $$url = "/auth/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
