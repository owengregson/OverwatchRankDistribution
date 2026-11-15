import { mount } from 'svelte';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/cursors.css';
import './styles/controls.css';
import App from './App.svelte';
import { discourageInspecting } from './lib/guard.js';
import { app } from './lib/state/app.svelte.js';

discourageInspecting();
app.refreshSeasons();

mount(App, { target: document.getElementById('app') });
