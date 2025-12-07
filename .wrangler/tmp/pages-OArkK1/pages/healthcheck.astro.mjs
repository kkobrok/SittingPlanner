globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, ae as renderHead, a as renderTemplate } from '../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_2pSJbG7R.mjs';

const $$Healthcheck = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html> <head><title>Health Check</title>${renderHead()}</head> <body> <h1>OK</h1> <p>Server is running</p> <p>Time: ${(/* @__PURE__ */ new Date()).toISOString()}</p> </body></html>`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/healthcheck.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/healthcheck.astro";
const $$url = "/healthcheck";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Healthcheck,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
