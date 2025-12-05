Svelte 5 Runes: A Practical Pattern Guide for Modern Development

Introduction: From Compiler Magic to Explicit Signals

Welcome to the next evolution of Svelte! If you've used Svelte before, you're familiar with its "magic"—the way the compiler could turn simple variable assignments into reactive updates. Svelte 5 introduces a new paradigm called "Runes," which represents a shift from that compiler magic to a more explicit and powerful system based on signals.

This new approach makes your code more readable, predictable, and performant. Under the hood, this shift enables fine-grained reactivity. Instead of re-running entire chunks of a component when a value changes, Svelte 5 can update the exact piece of the DOM—down to an individual text node—that depends on that value. This unlocks major performance gains.

This guide is designed to help you translate your existing Svelte knowledge into modern Svelte 5 patterns. Through clear, side-by-side comparisons, you'll see how to solve common problems in a way that is both intuitive and aligned with standard JavaScript.

---

1. Defining Component Boundaries: Props & Events

A component's public "contract" is defined by the data it accepts (props) and the messages it sends out (events). Svelte 5 streamlines both of these with Runes, moving away from special syntax toward patterns you'll recognize from modern JavaScript.

1.1. Pattern 1: Receiving Data with $props

In Svelte 4, the export let syntax was a unique feature for declaring component props. Svelte 5 replaces this with the $props rune, which uses standard JavaScript destructuring.

Before: export let (Svelte 4)

<script>
  export let isOpen = false;
</script>

After: $props Rune (Svelte 5)

<script>
  let { isOpen = false } = $props();
</script>

The primary benefit of the $props approach is its clarity and consistency with the rest of the JavaScript ecosystem. This change is more than syntactic; it replaces a Svelte-specific keyword (export let) with a universal JavaScript pattern (object destructuring), making component APIs immediately familiar to any JS developer. This also elegantly solves legacy Svelte's awkward syntax for renaming props (e.g., export { className as class }), replacing it with standard destructuring aliasing (let { class: className } = $props();).

1.2. Pattern 2: Emitting Events with Callback Props

Svelte 4 used a special createEventDispatcher function to send events from a child component to its parent. Svelte 5 simplifies this by treating events as regular callback functions passed down as props.

Before: createEventDispatcher (Svelte 4)

<!-- Child.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

<button on:click={handleClose}>
  Close
</button>

After: Callback Props (Svelte 5)

<!-- Child.svelte -->
<script>
  // The `onclose` prop is an optional function passed by the parent.
  // In TypeScript, its type would be `() => void`.
  let { onclose } = $props();
</script>

<!-- Use a standard onclick attribute -->

<button onclick={() => onclose?.()}>
Close
</button>

Key Insight: By using callback functions as props, Svelte 5 aligns with standard JavaScript patterns, making components more predictable and removing the need for a Svelte-specific event system. This aligns with patterns used in frameworks like React, where passing functions as props is the standard for communication, eliminating the need for a separate, Svelte-specific event system (createEventDispatcher). This alignment extends to DOM events as well, where Svelte 5 favors standard onclick over the Svelte-specific on:click directive, further reducing the API surface area you need to learn.

Now that we've defined our component's external contract, let's look at how Runes manage its internal logic and state.

---

2. Managing Internal Logic: State and Derived Values

At the heart of any interactive component is its internal state. Runes provide explicit, powerful tools for declaring reactive state and computing new values based on it.

2.1. Pattern 3: Creating Reactive State with $state

In previous versions of Svelte, any variable declared with let was automatically reactive. Svelte 5 makes this explicit with the $state rune.

Before: Implicit let (Svelte 4)

<script>
  let count = 0;
</script>

After: Explicit $state (Svelte 5)

<script>
  let count = $state(0);
</script>

Using $state offers two crucial benefits:

- Explicit Reactivity: The $state rune makes it immediately obvious which values in your component are reactive. This reduces compiler "magic" and makes your code's behavior easier to understand and debug.
- Deep Reactivity: $state makes nested objects and arrays fully reactive. If you change a property on an object or push an item to an array, Svelte will automatically detect the change and update the UI, eliminating the need for workarounds like myArray = myArray to trigger updates for nested changes.

  2.2. Pattern 4: Calculating Derived State with $derived

Svelte has always been excellent at deriving data from existing state. The reactive $: label in Svelte 4 is now replaced by the more focused and performant $derived rune.

Before: The $ Label (Svelte 4)

<script>
  let count = 0;

  // This statement re-runs whenever `count` changes.
  $: doubled = count * 2;
</script>

After: The $derived Rune (Svelte 5)

<script>
  let count = $state(0);

  // This creates a derived signal that depends on `count`.
  let doubled = $derived(count * 2);
</script>

The $derived rune is a significant improvement because it clearly separates the act of deriving data from running side effects. Furthermore, derived values are lazy—they are only recalculated when they are actually read by another part of your application (like the template). This is a powerful performance optimization. For example, if a derived value is used in a part of the UI that is currently hidden by an {#if} block, Svelte won't waste CPU cycles calculating it until it's actually needed.

While $derived is for creating new data, we need a different tool for interacting with the outside world, such as making an API call or logging to the console.

---

3. Handling Side Effects: The $effect Rune

Side effects are actions that interact with systems outside of the component's rendering, like timers, browser APIs, or data fetching. Svelte 5 unifies all side effects and component lifecycle logic into a single, powerful rune: $effect.

3.1. Pattern 5: From Lifecycle Functions to a Unified $effect

The $effect rune replaces the need for onMount, afterUpdate, the reactive $: {} block, and onDestroy. It runs a function whenever one of its dependencies changes, right after the DOM has been updated.

Example: Logging a Search Query

This example shows how $effect can track a reactive value, run code when it changes, and clean up after itself.

<script>
  let query = $state('');
  
  $effect(() => {
    // This code runs after the DOM updates, similar to afterUpdate.
    // It automatically re-runs whenever `query` changes.
    console.log(`The current search query is: ${query}`);

    // The function you return here is a cleanup function.
    // It runs before the effect runs again, or when the
    // component is destroyed. This replaces onDestroy.
    return () => {
      console.log('Cleaning up previous effect for:', query);
    };
  });
</script>

<input
value={query}
oninput={(event) => query = event.target.value}
placeholder="Search..."
/>

Crucial Warning: Never use $effect to change state that is read in the same component, as this can cause inefficient 'double render' passes. For creating new state based on existing state, always prefer the performance and predictability of $derived.

With internal logic and side effects covered, let's see how Svelte 5 re-imagines how we compose components together.

---

4. Composing Components: From <slot> to Snippets

Composition is key to building complex UIs from simple, reusable parts. Svelte 5 evolves its composition model from the <slot> element to a more flexible concept called "snippets."

4.1. Pattern 6: Passing UI with Snippets

A snippet is a piece of UI that you can pass around like a value—specifically, like a function that renders markup. This replaces the more rigid <slot> system with a pattern that offers far more flexibility.

Before: The <slot> Element (Svelte 4)

<!-- Panel.svelte -->
<div class="panel">
  <div class="panel-content">
    <slot />
  </div>
</div>

After: The {@render} Tag (Svelte 5)

<!-- Panel.svelte -->
<script>
  // The 'children' prop is expected to be a renderable snippet.
  // In TypeScript, its type is `import('svelte').Snippet`.
  let { children } = $props();
</script>

<div class="panel">
  <div class="panel-content">
    {@render children?.()}
  </div>
</div>

The key takeaway is that snippets are more powerful than slots because they are first-class values—essentially render functions—that can be passed as props, stored in variables, or returned from other functions, offering far greater dynamic control over composition. This embraces a powerful functional programming concept, making your component structures more predictable than with the special <slot> tag.

---

Conclusion: Embracing the New Svelte

Svelte 5's Runes introduce a more explicit, powerful, and modern way to build applications. By mastering these core patterns—$props for clear component interfaces, $state and $derived for predictable logic, $effect for managing side effects, and snippets for flexible composition—you are equipping yourself with the tools to write more robust, readable, and performant Svelte applications than ever before. Happy coding!
