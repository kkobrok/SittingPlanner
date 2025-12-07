globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, ad as addAttribute } from '../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../chunks/AppShell_Da3zkd3O.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_2pSJbG7R.mjs';

const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  let events = [];
  try {
    const res = await fetch("/api/events");
    if (res.ok) {
      const data = await res.json();
      events = data.data ?? [];
    }
  } catch {
  }
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Events" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-6"> <h1 class="text-3xl font-bold">Your Events</h1> <a href="/events/create" class="rounded-full bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 text-sm font-semibold shadow">New Event</a> </div> ${events.length === 0 ? renderTemplate`<div class="text-center bg-white p-10 rounded-3xl border border-white/40 shadow"> <p class="text-gray-700 mb-4">No events yet.</p> <a href="/events/create" class="text-pink-600 font-semibold">
Create your first event
</a> </div>` : renderTemplate`<div class="grid md:grid-cols-3 gap-6"> ${events.map((ev) => renderTemplate`<a${addAttribute(`/events/${ev.id}/plan`, "href")} class="group bg-white rounded-2xl p-5 border border-white/40 shadow hover:shadow-md transition"> <h2 class="font-semibold text-gray-900 mb-2 group-hover:text-pink-600">${ev.name}</h2> <p class="text-sm text-gray-600">Date: ${ev.date}</p> <p class="text-xs text-gray-500 mt-2">
Guests: ${ev.guest_count ?? 0} · Tables: ${ev.table_count ?? 0} </p> </a>`)} </div>`}` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/events/index.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/events/index.astro";
const $$url = "/events";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
