// popup mounter
// svelte 5 mount() for popup ui

import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
