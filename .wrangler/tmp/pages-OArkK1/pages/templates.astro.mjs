globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_D4BVXBCg.mjs';
import { $ as $$AppShell } from '../chunks/AppShell_Da3zkd3O.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_2pSJbG7R.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const prerender = false;
const $$Templates = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, { "title": "Templates" }, { "default": ($$result2) => renderTemplate(_a || (_a = __template([" ", `<div class="max-w-7xl mx-auto"> <!-- Header --> <div class="mb-8"> <h1 class="text-3xl font-semibold tracking-tight mb-2">Seating Plan Templates</h1> <p class="text-sm text-muted-foreground">Save and reuse seating arrangements across events</p> </div> <!-- Coming Soon Message --> <div class="text-center bg-card/95 backdrop-blur-sm rounded-3xl p-16 border border-border/60 shadow-[var(--shadow-lg)]"> <div class="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"> <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path> </svg> </div> <h2 class="text-2xl font-bold text-foreground mb-4">Templates Coming Soon</h2> <p class="text-muted-foreground mb-8 max-w-2xl mx-auto">
Save your favorite seating arrangements as templates and reuse them for future events. Perfect for recurring
        events or when you have a proven seating plan that works well.
</p> <!-- Feature Preview Cards --> <div class="grid md:grid-cols-3 gap-6 mt-12 text-left"> <div class="bg-background/50 backdrop-blur-sm rounded-xl p-6 border border-border/40"> <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"> <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path> </svg> </div> <h3 class="text-lg font-semibold mb-2">Save as Template</h3> <p class="text-sm text-muted-foreground">
Convert any successful seating plan into a reusable template with one click
</p> </div> <div class="bg-background/50 backdrop-blur-sm rounded-xl p-6 border border-border/40"> <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"> <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path> </svg> </div> <h3 class="text-lg font-semibold mb-2">Visual Previews</h3> <p class="text-sm text-muted-foreground">
See thumbnail previews of your templates to quickly find the right one
</p> </div> <div class="bg-background/50 backdrop-blur-sm rounded-xl p-6 border border-border/40"> <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"> <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path> </svg> </div> <h3 class="text-lg font-semibold mb-2">Share Templates</h3> <p class="text-sm text-muted-foreground">
Share your templates with team members or use community templates (Premium)
</p> </div> </div> <!-- Notify Button --> <div class="mt-12"> <button id="notifyBtn" class="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-150">
Notify Me When Available
</button> <p id="notifyStatus" class="text-sm text-green-600 hidden mt-3" role="alert" aria-live="polite">
\u2713 You'll be notified when templates are available!
</p> </div> <!-- Back to Dashboard Link --> <div class="mt-8"> <a href="/dashboard" class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path> </svg>
Back to Dashboard
</a> </div> </div> </div> <script>
    /* eslint-disable prettier/prettier */
    (function () {
      const notifyBtn = document.getElementById("notifyBtn");
      const notifyStatus = document.getElementById("notifyStatus");

      notifyBtn?.addEventListener("click", () => {
        // Store notification preference in localStorage
        localStorage.setItem("notifyTemplates", "true");

        // Show success message
        notifyStatus?.classList.remove("hidden");
        notifyBtn.disabled = true;
        notifyBtn.classList.add("opacity-50", "cursor-not-allowed");
        notifyBtn.textContent = "Notification Set";
      });

      // Check if already subscribed
      if (localStorage.getItem("notifyTemplates") === "true") {
        notifyStatus?.classList.remove("hidden");
        notifyBtn.disabled = true;
        notifyBtn.classList.add("opacity-50", "cursor-not-allowed");
        notifyBtn.textContent = "Notification Set";
      }
    })();
  <\/script> `])), maybeRenderHead()) })}`;
}, "C:/Users/kkobr/code/SittingPlanner/src/pages/templates.astro", void 0);

const $$file = "C:/Users/kkobr/code/SittingPlanner/src/pages/templates.astro";
const $$url = "/templates";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Templates,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
