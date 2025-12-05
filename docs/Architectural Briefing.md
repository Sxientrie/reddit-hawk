Architectural Briefing: The Sxentrie Svelte 5 "Runes" Migration

Executive Summary

The migration of the Sxentrie Chrome Extension to Svelte 5 represents a foundational architectural overhaul, shifting from a compiler-driven reactivity model to a runtime, signal-based system known as "Runes." This transition is not merely a syntactic update but a complete replacement of the underlying reactivity mechanism, enabling "Universal Reactivity" that can exist in standard TypeScript modules, not just Svelte components. The primary driver for this change is the "First Responder" performance requirement, where the extension's UI must remain highly responsive within the potentially hostile environment of a host page's DOM.

Svelte 5's fine-grained reactivity, powered by signals, resolves critical performance bottlenecks inherent in the previous architecture. Unlike Svelte 4's component-level invalidation, Runes ensure that only the specific DOM nodes dependent on a changed piece of state are updated. This significantly reduces reconciliation overhead, a crucial optimization for a content script.

Architecturally, the new model dismantles the rigid boundary between UI and business logic. By allowing reactive primitives like $state to operate in any .ts file, it enables a direct, synchronous-like mapping of asynchronous Chrome APIs (such as chrome.storage) to the UI layer, eliminating complex boilerplate associated with legacy stores. The migration mandates the strict adoption of new patterns, including the "Manual Mount" strategy for Shadow DOM to ensure style encapsulation with Tailwind CSS, and the "ChromeStorageProxy" pattern for state management, all while adhering to the stringent Content Security Policy (CSP) requirements of Manifest V3.

Phase 1: The "Runes" Paradigm Shift

The adoption of Runes marks a shift from implicit, compiler-driven reactivity to an explicit model where the developer uses specific symbols ($state, $derived, $effect) to define the application's reactive graph.

State Management: The Deprecation of let and store

The let keyword, previously the primary tool for local state within .svelte files, is replaced by the $state rune. This change makes reactivity explicit, portable, and more powerful.

- The $state Rune: This primitive creates a deep proxy around its initial value. Unlike Svelte 4, which required manual reassignment to trigger updates for nested properties, $state proxies intercept all get and set operations. This means mutations like array.push() are automatically reactive, simplifying state management logic.

The following table compares the legacy and new reactivity primitives:

Table 1: Reactivity Primitive Comparison

Feature Svelte 4 (Legacy) Svelte 5 (Runes) Architectural Implication
Declaration let count = 0; let count = $state(0); Reactivity is now opt-in and explicit, reducing compiler magic.
Object Mutation obj.x = 1; obj = obj; obj.x = 1; Deep proxies eliminate the need for self-assignment "ticks".
Scope .svelte files only Universal (.svelte, .js, .ts) Enables global state management without Store boilerplate.
Class Support Limited / Hacky First-class via Fields Allows OOP patterns for complex extension logic (e.g., ChromeStorage class).
Reactivity Type Component Invalidation Fine-grained Signals Updates target specific DOM nodes, bypassing component re-render.

- Derived State with $derived: Svelte 5 separates the concerns of derived values and side effects, which were previously conflated under the $: label. The $derived rune is a pure, side-effect-free primitive used exclusively for computing new values from existing state. Crucially, $derived values are lazy, meaning they are only calculated when read. This provides a significant optimization, as calculations tied to hidden UI elements will not run, saving CPU cycles.

Sxentrie Code Standard: Derived State

// SXENTRIE STANDARD - DO NOT USE $:
let { logs } = $props();
let errorLogs = $derived(logs.filter(l => l.level === 'error'));

Component Interface: The $props Rune

The confusing export let syntax for component properties is deprecated and replaced by the $props rune, which standardizes prop definition using standard JavaScript object destructuring. This enhances clarity and improves TypeScript integration.

Table 2: Property Definition Standards

Pattern Legacy Implementation (Banned) Sxentrie V3 Implementation Notes
Basic Prop export let isOpen = false; let { isOpen = false } = $props();	Default values handled via standard JS destructuring.
Renaming	export { className as class };	let { class: className } = $props();	Eliminates the confusing export-as syntax.
Rest Props	restProps	let {...rest } = $props();	$$props and $$restProps are strictly deprecated.
Type Safety Implicit / loose typing let props: MyProps = $props(); Enforces strict interfaces for extension messages.

Side Effects and Lifecycle: The $effect Rune

The $effect rune unifies the lifecycle functions onMount, afterUpdate, and onDestroy into a single primitive. An effect runs after the DOM has been updated, automatically tracking its dependencies and re-running when they change.

- Architectural Constraint: The function passed to $effect cannot be async. This is a deliberate design choice to prevent race conditions. For asynchronous operations, such as interacting with Chrome APIs, a specific "Resource Pattern" is required.
- Legacy Mapping:
  - onMount -> $effect(() => {... return cleanup })
  - afterUpdate -> $effect
  - onDestroy -> The cleanup function returned from an $effect
- Warning: Using $effect to synchronize state that is immediately read back into the DOM can cause a "double render" pass. $derived should be preferred for data synchronization wherever possible.

Composition: Snippets vs. Slots

The <slot> element is largely replaced by #snippet. Snippets are essentially render functions that can be passed as props, offering superior flexibility for component composition.

- Shadow DOM Exception: The native <slot> element remains critical when compiling Svelte components to Custom Elements for external content projection. For the Sxentrie architecture, which uses a manual Shadow DOM mount, internal composition should exclusively use snippets.

Sxentrie Code Standard: Snippets

<script>
let { header, children } = $props();
</script>

<div class="panel">
{@render header?.()}
<div class="content">
{@render children?.()}
</div>
</div>

Phase 2: Architecture Compatibility in the Extension Context

Adapting Svelte 5 to the Manifest V3 Chrome Extension environment requires specific configuration for the build system, style encapsulation, and security compliance.

Vite Integration and Multi-Entry Builds

A Chrome extension is a distributed system with multiple entry points (background worker, content script, popup). The build configuration must reflect this, moving away from standard SPA or SvelteKit setups.

- Configuration Protocol: A multi-entry Vite configuration is required, manually specifying the input points for Rollup. This provides stability and avoids potential compatibility issues with extension-specific Vite plugins that may lag behind Svelte 5 support.

Recommended vite.config.ts Structure:

// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
plugins: [
svelte({
compilerOptions: {
runes: true, // Force modern mode
}
})
],
build: {
rollupOptions: {
input: {
popup: path.resolve(**dirname, 'src/popup/index.html'),
// Background and Content scripts often require specific
// handling to output single JS files without hashing for manifest linkage
background: path.resolve(**dirname, 'src/background/index.ts'),
content: path.resolve(\_\_dirname, 'src/content/index.ts')
},
output: {
entryFileNames: 'assets/[name].js',
chunkFileNames: 'assets/[name].js',
assetFileNames: 'assets/[name].[ext]',
}
}
}
});

Shadow DOM and Style Encapsulation

To prevent style conflicts with host pages, the Sxentrie UI must be rendered within a Shadow DOM. The method of creating and managing this shadow boundary is critical.

- The "Manual Mount" Strategy (Mandatory): Instead of compiling the UI component as a Custom Element (<svelte:options customElement="tag-name" />), the content script will act as a loader. It manually creates a host element, attaches a shadow root, and then uses Svelte 5's mount() function to render the component inside. This approach provides full programmatic control, which is essential for injecting Tailwind CSS using Constructable Stylesheets and passing complex JavaScript objects as props.

Table 3: Shadow DOM Strategies

Strategy Pros Cons Verdict
customElement option Native browser behavior, simple API. Hard to inject global Tailwind; Props must be attributes; Slots required over snippets. Avoid for complex UIs.
Manual Shadow Mount Full control over styles; Props passed as JS objects; Supports Snippets. Requires manual boilerplate in entry script. Mandatory for Sxentrie.

Content Security Policy (CSP) and Manifest V3

Manifest V3 enforces a strict CSP that forbids eval() and remotely hosted code.

- unsafe-eval in Development: Vite's Hot Module Replacement (HMR) uses eval(), which violates CSP. This must be mitigated with a compatible plugin or by acknowledging HMR may not function correctly in content script contexts.
- Inline Scripts in Production: The production build must be configured to avoid generating inline scripts or styles that would violate CSP. Specifically, the devtool option for sourcemaps should be set to hidden-source-map or false, never an eval-based option.

Phase 3: Sxentrie-Specific Optimization and Logic Mapping

This phase details how Svelte 5's architecture directly addresses the business logic requirements of the Sxentrie extension, particularly state synchronization with chrome.storage.

Fine-Grained Reactivity vs. Legacy Stores

While Svelte 4 stores are not deprecated, the "Universal Reactivity" offered by Runes provides a superior model. A legacy store update triggers all subscribers. In contrast, updating a single property on a $state object will only trigger UI updates that depend on that specific property. This fine-grained control is essential for meeting the "First Responder" performance target.

The ChromeStorageProxy Pattern

To bridge the asynchronous chrome.storage API with Svelte's synchronous state model, a "Resource" pattern encapsulated in a TypeScript class is the mandated approach. This ChromeStorageProxy class serves as the single source of truth for all persistent state.

- Implementation Logic:
  1. The class holds its data in a private $state property.
  2. It initializes its state asynchronously by reading from chrome.storage.local.
  3. It listens to chrome.storage.onChanged events to keep its state synchronized across different parts of the extension (e.g., popup and content script).
  4. It exposes methods that update both the internal $state and write back to chrome.storage.local.

This pattern fully decouples the UI from the asynchronous storage mechanism, allowing components to consume a simple reactive object.

ChromeStorageProxy Class Structure:

// src/lib/storage.svelte.ts
/\*

- SXENTRIE STORAGE PROXY
- Implements Universal Reactivity for Chrome Storage
  \*/
  export class ChromeStorageProxy<T> {
  // Private reactive state
  #value = $state<T | undefined>(undefined);
  #initialized = $state(false);

// ... (Constructor, async init, getters/setters)
}

Library Compatibility and Ecosystem Status

The migration requires a thorough audit and update of key dependencies to ensure compatibility with Svelte 5.

- bits-ui (CRITICAL): The headless UI library is undergoing a complete rewrite for Svelte 5. Sxentrie must upgrade to bits-ui version 1.0.0-next.x or higher. This involves significant breaking changes:
  - The asChild prop is replaced by a child snippet prop.
  - The let:builder directive is removed in favor of passing the builder object as an argument to the children snippet.
  - The el prop is renamed to ref.
- lucide-svelte: This icon library is fully compatible. The refactor should enforce explicit, direct imports of icons for better tree-shaking.
- svelte-check: The project must upgrade to svelte-check v4.0 or higher to get correct type diagnostics for the new Runes syntax.

Detailed Migration Guide: Component Refactor

The following example illustrates the mandatory refactoring pattern for a UI component.

Legacy Svelte 4 Pattern (Deprecated)

<script>
  import { createEventDispatcher } from 'svelte';
  export let visible = false;
  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }
</script>

{#if visible}

  <div class="face">
    <slot />
    <button on:click={close}>Close</button>
  </div>
{/if}

Svelte 5 Runes Pattern (Mandatory)

<script lang="ts">
  import { Activity } from 'lucide-svelte';

  // Define Props Interface
  interface Props {
    visible?: boolean;
    children?: import('svelte').Snippet; // Typing for snippet
    onclose?: () => void; // Callback prop replaces dispatcher
  }

  // Destructure props with defaults
  let {
    visible = false,
    children,
    onclose
  }: Props = $props();

  // Local state
  let isHovered = $state(false);
</script>

{#if visible}

  <div
    class="face"
    role="dialog"
    onmouseenter={() => isHovered = true}
    onmouseleave={() => isHovered = false}
  >
    {@render children?.()}
    <button onclick={onclose}>Close</button>
  </div>
{/if}

Key Changes: createEventDispatcher and <slot> are eliminated in favor of callback props (onclose) and snippets ({@render children}). DOM event handlers (on:click) are replaced with standard HTML attributes (onclick), improving type safety.

Conclusions and Operational Directives

The migration to Svelte 5 is an architectural necessity to meet the performance and maintainability goals of the Sxentrie extension. The signal-based reactivity of Runes provides the foundation for a high-performance, type-safe, and modern architecture that complies with Chrome's Manifest V3 security policies.

Directives for Implementation:

1. Enforce Strict Runes Mode: All Svelte configurations must enforce Runes mode and disallow legacy syntax.
2. Adopt the "Manual Mount" Shadow DOM Pattern: Use the mount() API on a manually created ShadowRoot. Do not use the <svelte:options customElement /> compiler option.
3. Implement ChromeStorageProxy: Immediately replace all writable stores that synchronize with chrome.storage with the universal reactivity class pattern.
4. Audit for unsafe-eval: The production build pipeline must be verified to strip all eval usage and comply with Manifest V3.
5. Library Upgrade: Update bits-ui to v1.0-next and refactor all UI components to use the new snippet-based API.

Appendix: Sxentrie Stack Directory Structure

The following project structure is recommended to support the multi-entry build architecture:

src/
├── background/
│ ├── index.ts # Service Worker Entry
│ └── manager.ts # Background logic (can import .svelte.ts state)
├── content/
│ ├── index.ts # Content Script (Shadow DOM Mounter)
│ ├── Face.svelte # Root Component (Runes)
│ └── styles.css # Tailwind directives
├── popup/
│ ├── index.html # Popup Entry HTML
│ ├── main.ts # Popup Mounter
│ └── Popup.svelte # Popup Root
├── lib/
│ ├── storage.svelte.ts # Universal Reactivity Storage Proxy
│ ├── components/ # bits-ui & shared components
│ └── utils/
└── manifest.json
