globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$Layout } from '../chunks/Layout_DpeknBrK.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_2pSJbG7R.mjs';

const $$Test = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Tailwind Test" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="p-8"> <h1 class="text-4xl font-bold text-blue-600 mb-4">Tailwind Test Page</h1> <p class="text-red-500 bg-yellow-200 p-4 rounded-lg">
If you see this text in RED on a YELLOW background with rounded corners, Tailwind is working!
</p> <div class="mt-4 bg-primary text-primary-foreground p-4 rounded-lg">
This should use custom primary colors from CSS variables
</div> </div> ` })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/test.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/test.astro";
const $$url = "/test";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Test,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
