globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, g as renderScript } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../../chunks/AppShell_Da3zkd3O.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const prerender = false;
const $$Create = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Create Event" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-lg mx-auto bg-white rounded-3xl p-8 shadow-lg border border-white/40"> <h1 class="text-3xl font-bold mb-6">Create New Event</h1> <form id="eventForm" class="space-y-5" method="post" novalidate> <div> <label for="name" class="block text-sm font-medium text-gray-700">Event Name</label> <input id="name" name="name" required maxlength="255" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-pink-500 focus:border-pink-500"> </div> <div> <label for="date" class="block text-sm font-medium text-gray-700">Date</label> <input id="date" name="date" type="date" required class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-pink-500 focus:border-pink-500"> </div> <button type="submit" class="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow">Create Event</button> <p id="status" class="text-sm text-red-600 hidden" aria-live="polite"></p> </form> </div> ${renderScript($$result2, "C:/Users/kkobr/code/SittingPlanner/src/pages/events/create.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/events/create.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/events/create.astro";
const $$url = "/events/create";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Create,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
