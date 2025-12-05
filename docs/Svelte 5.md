# **ARCHITECTURE UPDATE: SVELTE 5 "RUNES" MIGRATION & SXENTRIE EXTENSION PROTOCOL**

## **1\. Executive Summary: The Runes Paradigm Shift and Architectural Implications**

The impending migration of the Sxentrie Chrome Extension from the legacy Svelte 3/4 paradigm to the Svelte 5 "Runes" architecture represents a foundational shift in how frontend state is conceptualized, managed, and rendered. This is not merely a syntactic upgrade; it is a complete replacement of the underlying reactivity model. The transition moves the codebase from a compiler-driven, component-bound reactivity system to a runtime, signal-based architecture that offers universal reactivity. For an extension architecture like Sxentrie, which relies on high-performance "First Responder" capabilities within the hostile environment of a host page's DOM, this shift unlocks critical performance optimizations and resolves long-standing architectural bottlenecks related to chrome.storage synchronization and Shadow DOM encapsulation.

The legacy Svelte model relied heavily on compiler instrumentation, where top-level let declarations were reactive only within the confines of a .svelte file. This created a rigid boundary between UI logic and business logic, often forcing developers to rely on the writable store pattern for any state shared between the background service worker and the content script interface. Svelte 5 dismantles this boundary. The introduction of "Runes"—specifically $state, $derived, and $effect—allows reactivity to exist in standard TypeScript modules (.svelte.ts), enabling a direct, synchronous-like mapping of the asynchronous Chrome Extension APIs to the UI layer.

This dossier provides a comprehensive, deep-dive analysis of the necessary architectural changes. It serves as the definitive source of truth for the development agents, explicitly strictly forbidding deprecated patterns such as export let, createEventDispatcher, and the misuse of reactive statements ($: ) for side effects. The analysis prioritizes the strict constraints of Manifest V3 (MV3), specifically addressing Content Security Policy (CSP) violations related to unsafe-eval and the complexities of injecting Tailwind CSS into a closed Shadow Root.

### **1.1 The Operational Necessity of Fine-Grained Reactivity**

The primary driver for this architectural overhaul is the "First Responder" requirement of the Sxentrie extension. In the previous Svelte 4 architecture, reactivity was coarse-grained. An update to a single property in a complex object often triggered the invalidation of the entire component or significant sub-trees of the DOM. For a content script injected into a heavy third-party application, this main-thread blocking behavior is unacceptable.

Svelte 5 introduces fine-grained reactivity powered by signals. When a specific property of a $state proxy is mutated, only the specific DOM nodes (text nodes, attributes) dependent on that exact property are scheduled for updates. The component boundary itself becomes irrelevant to the update cycle. Benchmarks and architectural analyses indicate that this reduces the reconciliation overhead significantly, ensuring that the Sxentrie interface remains responsive even when the host page is under heavy load.1

## ---

**2\. Phase 1: The "Runes" Paradigm Shift (Syntax & Reactivity Audit)**

The adoption of Runes requires a mental shift from "implicit reactivity" (where the compiler guesses intent based on variable assignments) to "explicit reactivity" (where the developer defines the reactivity model using specific symbols). This section details the mandatory syntax replacements and the theoretical underpinnings of the new model.

### **2.1 State Management: The Deprecation of let and store**

In Svelte 4, the primary mechanism for local state was the let keyword. While simple, it was architecturally limited. It could not be exported, moved to helper files, or composed without converting the logic into a Store. Svelte 5 replaces this with the $state rune.

#### **2.1.1 The $state Rune Mechanism**

The $state rune creates a deep proxy around the initial value. Unlike Svelte 4's reactivity, which required reassignment (obj \= obj) to trigger updates for nested properties, $state proxies intercept get and set operations deeply.

**Table 1: Reactivity Primitive Comparison**

| Feature | Svelte 4 (Legacy) | Svelte 5 (Runes) | Architectural Implication |
| :---- | :---- | :---- | :---- |
| **Declaration** | let count \= 0; | let count \= $state(0); | Reactivity is now opt-in and explicit, reducing compiler magic. |
| **Object Mutation** | obj.x \= 1; obj \= obj; | obj.x \= 1; | Deep proxies eliminate the need for self-assignment "ticks".3 |
| **Scope** | .svelte files only | Universal (.svelte, .js, .ts) | Enables global state management without Store boilerplate. |
| **Class Support** | Limited / Hacky | First-class via Fields | Allows OOP patterns for complex extension logic (e.g., ChromeStorage class). |
| **Reactivity Type** | Component Invalidation | Fine-grained Signals | Updates target specific DOM nodes, bypassing component re-render.2 |

The usage of $state is mandatory for all mutable data within the Sxentrie extension. The proxy mechanism ensures that operations like array.push() or map.set() are automatically reactive, simplifying the code required to track logs or user events in the content script.3

#### **2.1.2 The Evolution of Derived State**

Legacy Svelte relied on the $: label for both derived values and side effects. This conflation often led to "waterfalls" of updates that were difficult to debug. Svelte 5 strictly separates these concerns.

The $derived rune is used exclusively for deriving new data from existing state. It is a pure, side-effect-free primitive. Critically, $derived values are **lazy**; they are not calculated until they are read. In the context of Sxentrie, this is a massive optimization. If a derived calculation is bound to a part of the "Face" UI that is currently hidden or minimized, the calculation will never run, saving CPU cycles on the host page.4

**Code Standard: Derived State**

TypeScript

// SXENTRIE STANDARD \- DO NOT USE $:  
let { logs } \= $props();  
let errorLogs \= $derived(logs.filter(l \=\> l.level \=== 'error'));

### **2.2 Component Interface: The $props Rune**

The legacy syntax export let prop \= default was often cited as one of the most confusing aspects of Svelte, as it repurposed standard JavaScript module syntax for component properties. Svelte 5 standardizes this with the $props rune, which uses standard object destructuring.

#### **2.2.1 Destructuring and Rest Props**

The $props() rune allows for immediate destructuring of input properties. This facilitates better TypeScript integration, as the generic type passed to $props\<T\>() serves as the definitive contract for the component.

**Table 2: Property Definition Standards**

| Pattern | Legacy Implementation (Banned) | Sxentrie V3 Implementation | Notes |
| :---- | :---- | :---- | :---- |
| **Basic Prop** | export let isOpen \= false; | let { isOpen \= false } \= $props(); | Default values handled via standard JS destructuring.6 |
| **Renaming** | export { className as class }; | let { class: className } \= $props(); | Eliminates the confusing export-as syntax. |
| **Rest Props** | $$restProps | let {...rest } \= $props(); | $$props and $$restProps are strictly deprecated.6 |
| **Type Safety** | Implicit / loose typing | let props: MyProps \= $props(); | Enforces strict interfaces for extension messages. |

The deprecation of export let is absolute. Migration scripts may attempt to preserve legacy syntax, but the Coder Agent must manually refactor these to $props to ensure compatibility with the new type checking systems available in svelte-check v4.6

### **2.3 Side Effects and Lifecycle: The $effect Rune**

In the Chrome Extension environment, side effects are common—synchronizing with chrome.storage, sending messages to the background worker, or manipulating the DOM. Svelte 5 unifies onMount, afterUpdate, and onDestroy into the $effect rune.

#### **2.3.1 Architectural Constraints of $effect**

The $effect rune runs a function after the DOM has been updated. It automatically tracks any state accessed within it and re-runs when that state changes. This replaces the $: {} blocks that contained side effects.

However, $effect introduces a critical constraint: **Synchronicity**. The function passed to $effect cannot be async. This is a deliberate design choice to prevent race conditions in the signal graph. For the Sxentrie extension, which relies heavily on async Chrome APIs, this requires a specific pattern (The Resource Pattern) discussed in Section 4\.8

**Legacy Replacement Map:**

* onMount $\\rightarrow$ $effect(() \=\> {... return cleanup }) (with empty dependency tracking if effectively static).  
* afterUpdate $\\rightarrow$ $effect.  
* onDestroy $\\rightarrow$ The return function of an $effect.

**Crucial Warning:** Do not use $effect to synchronize state that feeds back into the DOM immediately, as this causes a "double render" pass. Use $derived for data synchronization wherever possible.5

### **2.4 Composition: Snippets vs. Slots**

Svelte 5 deprecates \<slot\> in favor of \#snippet. Snippets are essentially "render functions" that can be passed around as props, offering significantly more flexibility than the slot mechanism.

#### **2.4.1 The Shadow DOM Exception**

While snippets are the standard for internal component composition, the \<slot\> element retains a specific, critical role when compiling to **Custom Elements** (Web Components). Because Sxentrie injects a UI via Shadow DOM, we must distinguish between *internal* composition (using snippets) and *external* projection (using slots).

If the Sxentrie "Face" is built as a generic Svelte component mounted manually into a Shadow Root (the recommended approach), snippets should be used. If the component is compiled using \<svelte:options customElement="sxentrie-face" /\>, then native Shadow DOM slots \<slot\> must be used to project content from the light DOM.6 Given the styling complexities of custom elements, the manual mount strategy (using snippets) is preferred.

**Code Standard: Snippets**

HTML

\<script\>  
  let { header, children } \= $props();  
\</script\>

\<div class\="panel"\>  
  {@render header?.()}  
  \<div class\="content"\>  
    {@render children?.()}  
  \</div\>  
\</div\>

## ---

**3\. Phase 2: Architecture Compatibility (Extension Context)**

The Svelte 5 architecture must be reconciled with the strict operational environment of a Manifest V3 Chrome Extension. This involves configuring the build system (Vite), managing style encapsulation (Shadow DOM), and ensuring security compliance (CSP).

### **3.1 Vite Integration & Multi-Entry Builds**

A Chrome extension is not a single application; it is a distributed system comprising a Background Service Worker, Content Scripts, a Popup, and an Options page. These entry points have different execution contexts and lifecycle requirements.

Svelte 5 relies on @sveltejs/vite-plugin-svelte. The standard SvelteKit adapter system is often ill-suited for extensions because it assumes a server-client relationship or a Single Page Application (SPA) routing model. For Sxentrie, we require a multi-entry Vite configuration.

#### **3.1.1 Build Configuration Protocol**

The build configuration must manually specify the input points for Rollup. We recommend avoiding "all-in-one" extension plugins if they lag behind Svelte 5 compatibility (e.g., specific issues with crxjs and Svelte 5 HMR have been noted in early adoption phases). A manual configuration ensures stability.12

**Architectural Recommendation:** Split the build or use rollupOptions.input to define distinct entry points.

TypeScript

// vite.config.ts  
import { defineConfig } from 'vite';  
import { svelte } from '@sveltejs/vite-plugin-svelte';  
import path from 'path';

export default defineConfig({  
  plugins: \[  
    svelte({  
      compilerOptions: {  
        runes: true, // Force modern mode  
      }  
    })  
  \],  
  build: {  
    rollupOptions: {  
      input: {  
        popup: path.resolve(\_\_dirname, 'src/popup/index.html'),  
        // Background and Content scripts often require specific   
        // handling to output single JS files without hashing for manifest linkage  
        background: path.resolve(\_\_dirname, 'src/background/index.ts'),  
        content: path.resolve(\_\_dirname, 'src/content/index.ts')  
      },  
      output: {  
        entryFileNames: 'assets/\[name\].js',  
        chunkFileNames: 'assets/\[name\].js',  
        assetFileNames: 'assets/\[name\].\[ext\]',  
      }  
    }  
  }  
});

### **3.2 Shadow DOM & Style Encapsulation**

The "Face" of Sxentrie must be injected into arbitrary host pages. To prevent the host page's CSS from wrecking our UI, and to prevent our Tailwind utility classes from polluting the host, Shadow DOM is non-negotiable.

#### **3.2.1 The Custom Element Pitfall**

Svelte 5 improves the \<svelte:options customElement="tag-name" /\> API, allowing for better prop handling. However, a significant limitation remains: **Tailwind CSS Injection**. Utility-first CSS frameworks rely on a global stylesheet. When using the automatic custom element compilation, injecting the massive Tailwind CSS string into the constructed element is complex and often leads to FOUC (Flash of Unstyled Content) or duplication of styles.11

Furthermore, mapping complex props (like the Sxentrie user settings object) to HTML attributes is problematic. Attributes are always strings. Svelte 5 supports reflect: true and type conversion, but passing large JSON objects via attributes is an anti-pattern in the DOM.11

#### **3.2.2 The "Manual Mount" Strategy (Recommended)**

Instead of compiling the Svelte component *as* a Custom Element, we treat the Content Script entry point as a "Loader" that manually instantiates a standard Svelte component inside a Shadow Root. This gives us full programmatic control over the ShadowRoot object.

**Mechanism:**

1. **Vite Import:** Import the compiled CSS as a raw string using the ?inline query suffix.  
2. **Constructable Stylesheets:** Create a CSSStyleSheet object and apply the Tailwind styles.  
3. **Adoption:** Assign this sheet to shadowRoot.adoptedStyleSheets.  
4. **Mount:** Use Svelte 5's mount() function to render the component into the shadow root.

This approach bypasses the limitations of the customElement compiler option and provides a clean, encapsulated environment for bits-ui and Tailwind.16

**Table 3: Shadow DOM Strategies**

| Strategy | Pros | Cons | Verdict |
| :---- | :---- | :---- | :---- |
| **customElement option** | Native browser behavior, simple API. | Hard to inject global Tailwind; Props must be attributes; Slots required over snippets. | **Avoid** for complex UIs. |
| **Manual Shadow Mount** | Full control over styles; Props passed as JS objects; Supports Snippets. | Requires manual boilerplate in entry script. | **Mandatory** for Sxentrie. |

### **3.3 Content Security Policy (CSP) & Manifest V3**

Manifest V3 strictly forbids remotely hosted code and the use of eval(). Svelte 4 and 5 both generally produce CSP-compliant code in production. However, two specific risks exist in the Svelte 5 ecosystem.

#### **3.3.1 unsafe-eval in Development**

Vite's HMR (Hot Module Replacement) uses eval() to swap modules during development. This will cause the extension to crash immediately in a standard extension environment.

* **Mitigation:** Use a plugin like @crxjs/vite-plugin (if compatible) which wraps the HMR client, or accept that HMR might break in strict content script contexts without specific overrides.

#### **3.3.2 Inline Scripts in Production**

Svelte sometimes generates inline scripts for transition optimization or hydration. Manifest V3 generally blocks inline scripts unless a hash is provided.

* **Mitigation:** In svelte.config.js or vite.config.ts, ensure that compilerOptions.css is not set to inject styles via JS in a way that triggers CSP violations. More importantly, verify that devtool (sourcemaps) is NOT set to eval or cheap-module-eval-source-map in the production build. Use hidden-source-map or false.18

## ---

**4\. Phase 3: "Sxentrie" Specific Optimization & Logic Mapping**

This phase bridges the gap between the low-level architecture and the specific business logic of Sxentrie: managing application state synchronized with chrome.storage.

### **4.1 Fine-Grained Reactivity vs. Legacy Stores**

Svelte 4 Stores (writable, readable) are not deprecated, but they are conceptually "foreign" to the new Runes system. A store is an object with a .subscribe() method. A Rune is a signal. While they can interoperate (using $ to auto-subscribe to stores), mixing them creates friction.

The Sxentrie Optimization:  
By replacing Stores with Universal Reactivity (Classes with $state fields), we gain significantly finer control. In a store, any update triggers all subscribers. In a $state object, updating settings.theme only triggers updates for the theme, even if the settings object contains fifty other properties. This is crucial for the "First Responder" performance target.1

### **4.2 The ChromeStorageProxy Pattern**

We require a mechanism to map the asynchronous chrome.storage.local API to the synchronous Svelte 5 state system. Since $effect cannot handle async functions directly in a way that pauses rendering, we use a "Resource" pattern encapsulated in a TypeScript class.

#### **4.2.1 Implementation Logic**

The ChromeStorageProxy serves as the single source of truth. It is a class that:

1. Holds an internal private $state.  
2. Initializes asynchronously from chrome.storage.local.  
3. Listens for chrome.storage.onChanged events (triggered by background workers or other tabs) and updates the local state.  
4. Exposes a setter that writes back to chrome.storage.local.

This pattern completely decouples the UI from the storage logic. The UI simply consumes a reactive object. If the data is not yet loaded, the UI can check a ready property (also reactive) to show a skeleton loader.

**Detailed Implementation:**

TypeScript

// src/lib/storage.svelte.ts  
/\*   
 \* SXENTRIE STORAGE PROXY  
 \* Implements Universal Reactivity for Chrome Storage  
 \*/

export class ChromeStorageProxy\<T\> {  
    // Private reactive state  
    \#value \= $state\<T | undefined\>(undefined);  
    \#initialized \= $state(false);  
      
    // Configuration  
    readonly \#key: string;  
    readonly \#defaultValue: T;

    constructor(key: string, defaultValue: T) {  
        this.\#key \= key;  
        this.\#defaultValue \= defaultValue;  
          
        // Optimistic initialization with default  
        this.\#value \= defaultValue; 

        // Begin async hydration  
        this.\#hydrate();  
    }

    async \#hydrate() {  
        if (typeof chrome \=== 'undefined' ||\!chrome.storage) return;

        // 1\. Initial Fetch  
        const result \= await chrome.storage.local.get(this.\#key);  
        if (result\[this.\#key\]\!== undefined) {  
            this.\#value \= result\[this.\#key\];  
        }  
        this.\#initialized \= true;

        // 2\. Sync Listener (Background \-\> Content)  
        chrome.storage.onChanged.addListener((changes, area) \=\> {  
            if (area \=== 'local' && changes\[this.\#key\]) {  
                // Update local state without triggering write-back loop  
                this.\#value \= changes\[this.\#key\].newValue;  
            }  
        });  
    }

    // Reactive Getter  
    get value() {  
        return this.\#value?? this.\#defaultValue;  
    }

    // Write-through Setter  
    set value(newValue: T) {  
        this.\#value \= newValue;  
        // Persist to Chrome Storage  
        if (typeof chrome\!== 'undefined' && chrome.storage) {  
            chrome.storage.local.set({ \[this.\#key\]: newValue });  
        }  
    }

    get ready() {  
        return this.\#initialized;  
    }  
}

This class demonstrates the power of **Universal Reactivity**. It is not a component; it is a plain TypeScript file, yet it drives the UI reactivity entirely. This replaces complex writable stores with custom set and update logic.21

## ---

**5\. Library Compatibility & Ecosystem Status**

The migration extends beyond Svelte core. The Sxentrie dependency tree must be audited for Svelte 5 compatibility.

### **5.1 bits-ui Migration (CRITICAL)**

bits-ui is the headless component library powering the Sxentrie UI. The release of Svelte 5 triggered a complete rewrite of bits-ui to version 1.0 (currently in beta/next).

**Breaking Changes:**

* **asChild Removal:** The asChild prop, used to delegate rendering to a child element, is removed. It is replaced by the child snippet prop.  
* **let:builder Deprecation:** Data is no longer exposed via let:builder. Instead, the children snippet receives the builder object as an argument.  
* **el $\\rightarrow$ ref:** The prop to access the underlying DOM element is renamed.

Migration Action:  
The package.json must be updated to target the next tag (e.g., ^1.0.0-next.x). The Coder Agent must rewrite all UI components (Dropdowns, Tooltips) to use the new snippet-based API.23

### **5.2 lucide-svelte**

lucide-svelte is fully compatible with Svelte 5\. Svelte 5 treats components as functions, which aligns with Lucide's architecture.

* **Refactor:** Ensure explicit imports of icons are used (import { Activity } from 'lucide-svelte'). Deprecated \<Icon name="..." /\> patterns utilizing dynamic component resolution should be avoided in favor of direct component usage for better tree-shaking.25

### **5.3 svelte-check**

Upgrade to svelte-check v4.0 or higher. This version includes the necessary language server updates to understand Runes syntax ($state, $props) and provide correct type diagnostics. Using older versions will result in false positives regarding "unknown global $state".27

## ---

**6\. Detailed Migration Guide: From Legacy to Modern**

This section provides the Coder Agent with side-by-side comparisons and strict implementation rules.

### **6.1 The "Face" Component Refactor**

**Legacy Svelte 4 Pattern (Deprecated):**

HTML

\<script\>  
  import { createEventDispatcher } from 'svelte';  
  export let visible \= false;  
  const dispatch \= createEventDispatcher();  
    
  function close() {  
    dispatch('close');  
  }  
\</script\>

{\#if visible}  
  \<div class\="face"\>  
    \<slot /\>  
    \<button on:click\={close}\>Close\</button\>  
  \</div\>  
{/if}

**Svelte 5 Runes Pattern (Mandatory):**

HTML

\<script lang\="ts"\>  
  import { Activity } from 'lucide-svelte';  
    
  // Define Props Interface  
  interface Props {  
    visible?: boolean;  
    children?: import('svelte').Snippet; // Typing for snippet  
    onclose?: () \=\> void; // Callback prop replaces dispatcher  
  }

  // Destructure props with defaults  
  let {   
    visible \= false,   
    children,   
    onclose   
  }: Props \= $props();

  // Local state  
  let isHovered \= $state(false);  
\</script\>

{\#if visible}  
  \<div   
    class\="face"  
    role\="dialog"  
    onmouseenter\={() \=\> isHovered \= true}  
    onmouseleave={() \=\> isHovered \= false}  
  \>  
    {@render children?.()}  
      
    \<button onclick\={onclose}\>Close\</button\>  
  \</div\>  
{/if}

**Key Changes:**

1. **createEventDispatcher is gone.** Events are passed as props (conventionally prefixed with on).  
2. **slot is gone.** Replaced by {@render children?.()}.  
3. **DOM Events:** on:click becomes onclick (standard HTML attributes). This improves type safety and removes Svelte-specific syntax overhead.28

## ---

**7\. Conclusions and Operational Directives**

The analysis confirms that migrating Sxentrie to Svelte 5 is not only viable but architecturally necessary to meet the "First Responder" performance targets. The shift to signal-based reactivity eliminates the performance overhead of component-level dirty checking, crucial for a content script running in a potentially resource-constrained environment.

**Directives for the Coder Agent:**

1. **Enforce Strict Runes Mode:** Configure svelte.config.js and vite.config.ts to enforce Runes mode. Disallow legacy syntax.  
2. **Adopt the "Manual Mount" Shadow DOM Pattern:** Do not use \<svelte:options customElement /\>. Use mount() on a ShadowRoot created in the content script entry file.  
3. **Implement ChromeStorageProxy:** Immediately replace all writable stores that sync with chrome.storage with the svelte.ts class pattern detailed in Section 4.2.  
4. **Audit for unsafe-eval:** Verify the production build pipeline strips all eval usage to comply with Manifest V3.  
5. **Library Upgrade:** Update bits-ui to v1.0-next immediately and refactor all UI components to use snippets instead of asChild.

This architecture provides a robust, type-safe, and high-performance foundation for Sxentrie V3, ensuring it remains the fastest extension in its class while fully complying with modern web standards and Chrome security policies.

## **8\. Appendix: "Sxentrie" Stack Directory Structure**

To support the multi-entry architecture, the project structure requires reorganization.

src/  
├── background/  
│ ├── index.ts \# Service Worker Entry  
│ └── manager.ts \# Background logic (can import.svelte.ts state)  
├── content/  
│ ├── index.ts \# Content Script (Shadow DOM Mounter)  
│ ├── Face.svelte \# Root Component (Runes)  
│ └── styles.css \# Tailwind directives  
├── popup/  
│ ├── index.html \# Popup Entry HTML  
│ ├── main.ts \# Popup Mounter  
│ └── Popup.svelte \# Popup Root  
├── lib/  
│ ├── storage.svelte.ts \# Universal Reactivity Storage Proxy  
│ ├── components/ \# bits-ui & shared components  
│ └── utils/  
└── manifest.json  
**Note:** src/content/index.ts is the *only* file that interacts directly with the host page DOM to create the Shadow Host. Face.svelte operates entirely within the shadow context. storage.svelte.ts is imported by both popup and content (and potentially background if bundled correctly) to share state logic.

***End of Report***

#### **Works cited**

1. What's new in Svelte 5 \- Vercel, accessed December 5, 2025, [https://vercel.com/blog/whats-new-in-svelte-5](https://vercel.com/blog/whats-new-in-svelte-5)  
2. Fine-Grained Reactivity in Svelte 5 – Frontend Masters Blog, accessed December 5, 2025, [https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/)  
3. $state • Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/svelte/$state](https://svelte.dev/docs/svelte/$state)  
4. $derived • Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/svelte/$derived](https://svelte.dev/docs/svelte/$derived)  
5. Understanding Svelte 5 Runes: $derived vs $effect \- DEV Community, accessed December 5, 2025, [https://dev.to/mikehtmlallthethings/understanding-svelte-5-runes-derived-vs-effect-1hh](https://dev.to/mikehtmlallthethings/understanding-svelte-5-runes-derived-vs-effect-1hh)  
6. Svelte 5 migration guide, accessed December 5, 2025, [https://svelte.dev/docs/svelte/v5-migration-guide](https://svelte.dev/docs/svelte/v5-migration-guide)  
7. export let • Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/svelte/legacy-export-let](https://svelte.dev/docs/svelte/legacy-export-let)  
8. $effect • Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/svelte/$effect](https://svelte.dev/docs/svelte/$effect)  
9. Svelte 5 $effect on modules · Issue \#13647 \- GitHub, accessed December 5, 2025, [https://github.com/sveltejs/svelte/issues/13647](https://github.com/sveltejs/svelte/issues/13647)  
10. How to properly handle async initialization in Svelte 5 without onMount? \- Stack Overflow, accessed December 5, 2025, [https://stackoverflow.com/questions/79569993/how-to-properly-handle-async-initialization-in-svelte-5-without-onmount](https://stackoverflow.com/questions/79569993/how-to-properly-handle-async-initialization-in-svelte-5-without-onmount)  
11. Custom elements • Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/custom-elements-api](https://svelte.dev/docs/custom-elements-api)  
12. Chrome Extension Starter using Vite, Svelte 5, TypeScript, TailwindCSS, and DaisyUI \- GitHub, accessed December 5, 2025, [https://github.com/trentbrew/svelte5-chrome-extension](https://github.com/trentbrew/svelte5-chrome-extension)  
13. Using Vite with multiple entry points, occasionally getting extra files in output folder, accessed December 5, 2025, [https://stackoverflow.com/questions/75379430/using-vite-with-multiple-entry-points-occasionally-getting-extra-files-in-outpu](https://stackoverflow.com/questions/75379430/using-vite-with-multiple-entry-points-occasionally-getting-extra-files-in-outpu)  
14. Svelte Components as Web Components | by Matias Simon | Medium, accessed December 5, 2025, [https://medium.com/@yesmeno/svelte-components-as-web-components-b400d1253504](https://medium.com/@yesmeno/svelte-components-as-web-components-b400d1253504)  
15. Pass Object into Web Component Property via Element Attribute · Issue \#3381 · sveltejs/svelte \- GitHub, accessed December 5, 2025, [https://github.com/sveltejs/svelte/issues/3381](https://github.com/sveltejs/svelte/issues/3381)  
16. How inject css in shadowDom with vite? \- javascript \- Stack Overflow, accessed December 5, 2025, [https://stackoverflow.com/questions/78127595/how-inject-css-in-shadowdom-with-vite](https://stackoverflow.com/questions/78127595/how-inject-css-in-shadowdom-with-vite)  
17. Is it possible to embed tailwind classes in a Svelte custom component isolated inside the Shadow DOM? \- Stack Overflow, accessed December 5, 2025, [https://stackoverflow.com/questions/77104748/is-it-possible-to-embed-tailwind-classes-in-a-svelte-custom-component-isolated-i](https://stackoverflow.com/questions/77104748/is-it-possible-to-embed-tailwind-classes-in-a-svelte-custom-component-isolated-i)  
18. CSP unsafe-eval and unsafe-inline errors on script-src self policy · Issue \#5195 · sveltejs/svelte \- GitHub, accessed December 5, 2025, [https://github.com/sveltejs/svelte/issues/5195](https://github.com/sveltejs/svelte/issues/5195)  
19. Manifest \- Content Security Policy | Chrome Extensions, accessed December 5, 2025, [https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)  
20. Chrome extension compiled by Webpack throws \`unsafe-eval\` error \- Stack Overflow, accessed December 5, 2025, [https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error](https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error)  
21. Svelte 5 runes with localStorage thanks to Joy of Code : r/sveltejs \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/sveltejs/comments/1d43d8p/svelte\_5\_runes\_with\_localstorage\_thanks\_to\_joy\_of/](https://www.reddit.com/r/sveltejs/comments/1d43d8p/svelte_5_runes_with_localstorage_thanks_to_joy_of/)  
22. Different Ways To Share State In Svelte 5 \- Joy of Code, accessed December 5, 2025, [https://joyofcode.xyz/how-to-share-state-in-svelte-5](https://joyofcode.xyz/how-to-share-state-in-svelte-5)  
23. Migration Guide \- Bits UI, accessed December 5, 2025, [https://next.bits-ui.com/docs/migration-guide](https://next.bits-ui.com/docs/migration-guide)  
24. Migration Guide \- Bits UI, accessed December 5, 2025, [https://www.bits-ui.com/docs/migration-guide](https://www.bits-ui.com/docs/migration-guide)  
25. Lucide Svelte, accessed December 5, 2025, [https://lucide.dev/guide/packages/lucide-svelte](https://lucide.dev/guide/packages/lucide-svelte)  
26. lucide/svelte \- NPM, accessed December 5, 2025, [https://www.npmjs.com/package/@lucide/svelte](https://www.npmjs.com/package/@lucide/svelte)  
27. svelte-check \- NPM, accessed December 5, 2025, [https://www.npmjs.com/package/svelte-check?activeTab=readme](https://www.npmjs.com/package/svelte-check?activeTab=readme)  
28. Deprecated createEventDispatcher usage in Svelte components · Issue \#4408 · ankitects/anki \- GitHub, accessed December 5, 2025, [https://github.com/ankitects/anki/issues/4408](https://github.com/ankitects/anki/issues/4408)  
29. Svelte Docs, accessed December 5, 2025, [https://svelte.dev/docs/svelte/svelte](https://svelte.dev/docs/svelte/svelte)