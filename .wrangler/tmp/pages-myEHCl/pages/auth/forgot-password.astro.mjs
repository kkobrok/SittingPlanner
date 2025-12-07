globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, g as renderScript } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../../chunks/AppShell_Da3zkd3O.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const prerender = false;
const $$ForgotPassword = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Forgot Password" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg border border-white/40"> <div id="requestForm"> <div class="text-center mb-6"> <div class="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4"> <svg class="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path> </svg> </div> <h1 class="text-2xl font-bold text-gray-900">Forgot Password?</h1> <p class="text-sm text-gray-600 mt-2">No worries, we'll send you reset instructions.</p> </div> <form id="forgotPasswordForm" class="space-y-4" method="post"> <div> <label for="email" class="block text-sm font-medium text-gray-700">Email</label> <input id="email" name="email" type="email" required autocomplete="email" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="your@email.com"> </div> <button type="submit" id="submitBtn" class="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"> <span id="submitText">Send Reset Link</span> <span id="submitLoading" class="hidden">Sending...</span> </button> <p id="forgotPasswordStatus" class="text-sm text-red-600 hidden" role="alert" aria-live="polite"></p> </form> <div class="mt-6 text-center"> <a href="/auth/login" class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"> <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path> </svg>
Back to login
</a> </div> </div> <!-- Success message (hidden by default) --> <div id="successMessage" class="hidden"> <div class="text-center"> <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"> <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> </div> <h2 class="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2> <p class="text-sm text-gray-600 mb-6">
If an account exists with the email you provided, we've sent password reset instructions to <span id="emailAddress" class="font-semibold"></span>.
</p> <p class="text-xs text-gray-500 mb-6">Didn't receive the email? Check your spam folder or try again.</p> <a href="/auth/login" class="inline-flex items-center justify-center w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors">
Back to Login
</a> </div> </div> </div> ${renderScript($$result2, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/forgot-password.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/forgot-password.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/forgot-password.astro";
const $$url = "/auth/forgot-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ForgotPassword,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
