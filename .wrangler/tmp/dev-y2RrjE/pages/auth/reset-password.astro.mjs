globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as createAstro, r as renderComponent, a as renderTemplate, m as maybeRenderHead, g as renderScript } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../../chunks/AppShell_Da3zkd3O.mjs';
import { c as createSupabaseServerInstance } from '../../chunks/supabase.client_DZxrQoTI.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const $$Astro = createAstro();
const prerender = false;
const $$ResetPassword = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$ResetPassword;
  const supabase = createSupabaseServerInstance({
    cookies: Astro2.cookies,
    headers: Astro2.request.headers
  });
  const { data: { session } } = await supabase.auth.getSession();
  const hasValidSession = !!session;
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Reset Password" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg border border-white/40"> ${!hasValidSession ? renderTemplate`<div class="text-center"> <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"> <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path> </svg> </div> <h1 class="text-2xl font-bold text-gray-900 mb-3">Invalid Reset Link</h1> <p class="text-sm text-gray-600 mb-6">
This password reset link is invalid or has expired. Please request a new one.
</p> <a href="/auth/forgot-password" class="inline-flex items-center justify-center w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors">
Request New Link
</a> </div>` : renderTemplate`<div id="resetForm"> <div class="text-center mb-6"> <div class="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4"> <svg class="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <!-- eslint-disable-next-line prettier/prettier --> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path> </svg> </div> <h1 class="text-2xl font-bold text-gray-900">Set New Password</h1> <p class="text-sm text-gray-600 mt-2">Enter your new password below.</p> </div> <form id="resetPasswordForm" class="space-y-4" method="post"> <div> <label for="password" class="block text-sm font-medium text-gray-700">New Password</label> <div class="relative"> <input id="password" name="password" type="password" required autocomplete="new-password" minlength="6" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="••••••••"> <button type="button" id="togglePassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Toggle password visibility"> <svg id="eyeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path> </svg> <svg id="eyeOffIcon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path> </svg> </button> </div> <!-- Password Strength Indicator --> <div class="mt-2"> <div class="flex gap-1"> <div id="strength1" class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"></div> <div id="strength2" class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"></div> <div id="strength3" class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"></div> <div id="strength4" class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"></div> </div> <p id="strengthText" class="text-xs text-gray-600 mt-1">At least 6 characters</p> </div> </div> <div> <label for="passwordConfirm" class="block text-sm font-medium text-gray-700">Confirm New Password</label> <div class="relative"> <input id="passwordConfirm" name="passwordConfirm" type="password" required autocomplete="new-password" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="••••••••"> <button type="button" id="togglePasswordConfirm" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Toggle password confirmation visibility"> <svg id="eyeIconConfirm" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path> </svg> <svg id="eyeOffIconConfirm" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path> </svg> </button> </div> <p id="matchError" class="text-xs text-red-600 mt-1 hidden" role="alert">Passwords do not match</p> </div> <button type="submit" id="submitBtn" class="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"> <span id="submitText">Reset Password</span> <span id="submitLoading" class="hidden">Resetting...</span> </button> <p id="resetPasswordStatus" class="text-sm text-red-600 hidden" role="alert" aria-live="polite"></p> </form> </div>

      <!-- Success message (hidden by default) -->
      <div id="successMessage" class="hidden"> <div class="text-center"> <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"> <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path> </svg> </div> <h2 class="text-2xl font-bold text-gray-900 mb-3">Password Reset Successfully</h2> <p class="text-sm text-gray-600 mb-6">
Your password has been reset. You can now sign in with your new password.
</p> <a href="/auth/login" class="inline-flex items-center justify-center w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow transition-colors">
Sign In
</a> </div> </div>`} </div> ${renderScript($$result2, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/reset-password.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/reset-password.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/auth/reset-password.astro";
const $$url = "/auth/reset-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ResetPassword,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
