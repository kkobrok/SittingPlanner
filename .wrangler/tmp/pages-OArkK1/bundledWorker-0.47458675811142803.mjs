var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js/index.js
import { r as renderers } from "./chunks/_@astro-renderers_2pSJbG7R.mjs";
import { c as createExports, s as serverEntrypointModule } from "./chunks/_@astrojs-ssr-adapter_dSAQiLf0.mjs";
import { manifest } from "./manifest_ojQVfDOL.mjs";
globalThis.process ??= {};
globalThis.process.env ??= {};
var serverIslandMap = /* @__PURE__ */ new Map();
var _page0 = /* @__PURE__ */ __name(() => import("./pages/_image.astro.mjs"), "_page0");
var _page1 = /* @__PURE__ */ __name(() => import("./pages/account.astro.mjs"), "_page1");
var _page2 = /* @__PURE__ */ __name(() => import("./pages/api/assignments/_id_.astro.mjs"), "_page2");
var _page3 = /* @__PURE__ */ __name(() => import("./pages/api/auth/forgot-password.astro.mjs"), "_page3");
var _page4 = /* @__PURE__ */ __name(() => import("./pages/api/auth/login.astro.mjs"), "_page4");
var _page5 = /* @__PURE__ */ __name(() => import("./pages/api/auth/logout.astro.mjs"), "_page5");
var _page6 = /* @__PURE__ */ __name(() => import("./pages/api/auth/register.astro.mjs"), "_page6");
var _page7 = /* @__PURE__ */ __name(() => import("./pages/api/auth/reset-password.astro.mjs"), "_page7");
var _page8 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/assignments.astro.mjs"), "_page8");
var _page9 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/guests.astro.mjs"), "_page9");
var _page10 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/relationships.astro.mjs"), "_page10");
var _page11 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/seating-plans/generate.astro.mjs"), "_page11");
var _page12 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/seating-plans/validate.astro.mjs"), "_page12");
var _page13 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_/tables.astro.mjs"), "_page13");
var _page14 = /* @__PURE__ */ __name(() => import("./pages/api/events/_id_.astro.mjs"), "_page14");
var _page15 = /* @__PURE__ */ __name(() => import("./pages/api/events.astro.mjs"), "_page15");
var _page16 = /* @__PURE__ */ __name(() => import("./pages/api/guests/_id_.astro.mjs"), "_page16");
var _page17 = /* @__PURE__ */ __name(() => import("./pages/api/proxy.astro.mjs"), "_page17");
var _page18 = /* @__PURE__ */ __name(() => import("./pages/api/relationships/_id_.astro.mjs"), "_page18");
var _page19 = /* @__PURE__ */ __name(() => import("./pages/api/seating-plans/_id_.astro.mjs"), "_page19");
var _page20 = /* @__PURE__ */ __name(() => import("./pages/api/tables/_id_.astro.mjs"), "_page20");
var _page21 = /* @__PURE__ */ __name(() => import("./pages/auth/callback.astro.mjs"), "_page21");
var _page22 = /* @__PURE__ */ __name(() => import("./pages/auth/forgot-password.astro.mjs"), "_page22");
var _page23 = /* @__PURE__ */ __name(() => import("./pages/auth/login.astro.mjs"), "_page23");
var _page24 = /* @__PURE__ */ __name(() => import("./pages/auth/register.astro.mjs"), "_page24");
var _page25 = /* @__PURE__ */ __name(() => import("./pages/auth/reset-password.astro.mjs"), "_page25");
var _page26 = /* @__PURE__ */ __name(() => import("./pages/dashboard.astro.mjs"), "_page26");
var _page27 = /* @__PURE__ */ __name(() => import("./pages/events/create.astro.mjs"), "_page27");
var _page28 = /* @__PURE__ */ __name(() => import("./pages/events/_eventid_/guests.astro.mjs"), "_page28");
var _page29 = /* @__PURE__ */ __name(() => import("./pages/events/_eventid_/plan.astro.mjs"), "_page29");
var _page30 = /* @__PURE__ */ __name(() => import("./pages/events/_eventid_/tables.astro.mjs"), "_page30");
var _page31 = /* @__PURE__ */ __name(() => import("./pages/events.astro.mjs"), "_page31");
var _page32 = /* @__PURE__ */ __name(() => import("./pages/healthcheck.astro.mjs"), "_page32");
var _page33 = /* @__PURE__ */ __name(() => import("./pages/templates.astro.mjs"), "_page33");
var _page34 = /* @__PURE__ */ __name(() => import("./pages/test.astro.mjs"), "_page34");
var _page35 = /* @__PURE__ */ __name(() => import("./pages/index.astro.mjs"), "_page35");
var pageMap = /* @__PURE__ */ new Map([
  ["node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js", _page0],
  ["src/pages/account.astro", _page1],
  ["src/pages/api/assignments/[id].ts", _page2],
  ["src/pages/api/auth/forgot-password.ts", _page3],
  ["src/pages/api/auth/login.ts", _page4],
  ["src/pages/api/auth/logout.ts", _page5],
  ["src/pages/api/auth/register.ts", _page6],
  ["src/pages/api/auth/reset-password.ts", _page7],
  ["src/pages/api/events/[id]/assignments.ts", _page8],
  ["src/pages/api/events/[id]/guests.ts", _page9],
  ["src/pages/api/events/[id]/relationships.ts", _page10],
  ["src/pages/api/events/[id]/seating-plans/generate.ts", _page11],
  ["src/pages/api/events/[id]/seating-plans/validate.ts", _page12],
  ["src/pages/api/events/[id]/tables.ts", _page13],
  ["src/pages/api/events/[id].ts", _page14],
  ["src/pages/api/events/index.ts", _page15],
  ["src/pages/api/guests/[id].ts", _page16],
  ["src/pages/api/proxy.ts", _page17],
  ["src/pages/api/relationships/[id].ts", _page18],
  ["src/pages/api/seating-plans/[id].ts", _page19],
  ["src/pages/api/tables/[id].ts", _page20],
  ["src/pages/auth/callback.astro", _page21],
  ["src/pages/auth/forgot-password.astro", _page22],
  ["src/pages/auth/login.astro", _page23],
  ["src/pages/auth/register.astro", _page24],
  ["src/pages/auth/reset-password.astro", _page25],
  ["src/pages/dashboard.astro", _page26],
  ["src/pages/events/create.astro", _page27],
  ["src/pages/events/[eventId]/guests.astro", _page28],
  ["src/pages/events/[eventId]/plan.astro", _page29],
  ["src/pages/events/[eventId]/tables.astro", _page30],
  ["src/pages/events/index.astro", _page31],
  ["src/pages/healthcheck.astro", _page32],
  ["src/pages/templates.astro", _page33],
  ["src/pages/test.astro", _page34],
  ["src/pages/index.astro", _page35]
]);
var _manifest = Object.assign(manifest, {
  pageMap,
  serverIslandMap,
  renderers,
  actions: /* @__PURE__ */ __name(() => import("./noop-entrypoint.mjs"), "actions"),
  middleware: /* @__PURE__ */ __name(() => import("./_astro-internal_middleware.mjs"), "middleware")
});
var _args = void 0;
var _exports = createExports(_manifest);
var __astrojsSsrVirtualEntry = _exports.default;
var _start = "start";
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
  serverEntrypointModule[_start](_manifest, _args);
}
export {
  __astrojsSsrVirtualEntry as default,
  pageMap
};
//# sourceMappingURL=bundledWorker-0.47458675811142803.mjs.map
