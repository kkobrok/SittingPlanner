globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as createAstro, m as maybeRenderHead, r as renderComponent, ab as Fragment, a as renderTemplate, ad as addAttribute } from './astro/server_D4BVXBCg.mjs';

const $$Astro$1 = createAstro();
const $$Breadcrumbs = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Breadcrumbs;
  const { items } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-muted-foreground mb-6"> ${items.map((item, index) => renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`${index > 0 && renderTemplate`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg>`}${item.href ? renderTemplate`<a${addAttribute(item.href, "href")} class="hover:text-primary transition-colors duration-150"> ${item.label} </a>` : renderTemplate`<span class="text-foreground font-semibold">${item.label}</span>`}` })}`)} </nav>`;
}, "C:/Users/kkobr/code/SittingPlanner/src/components/Breadcrumbs.astro", void 0);

const $$Astro = createAstro();
const $$EventNavTabs = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$EventNavTabs;
  const { eventId, activeTab } = Astro2.props;
  const tabs = [
    { id: "guests", label: "Guests", href: `/events/${eventId}/guests` },
    { id: "tables", label: "Tables", href: `/events/${eventId}/tables` },
    { id: "plan", label: "Seating Plan", href: `/events/${eventId}/plan` }
  ];
  return renderTemplate`${maybeRenderHead()}<div class="flex gap-1 border-b border-border/40"> ${tabs.map((tab) => renderTemplate`<a${addAttribute(tab.href, "href")}${addAttribute(`px-4 py-2.5 text-sm transition-colors duration-150 ${activeTab === tab.id ? "font-semibold text-primary border-b-2 border-primary" : "font-medium text-muted-foreground hover:text-foreground"}`, "class")}> ${tab.label} </a>`)} </div>`;
}, "C:/Users/kkobr/code/SittingPlanner/src/components/EventNavTabs.astro", void 0);

export { $$EventNavTabs as $, $$Breadcrumbs as a };
