import { mount } from 'svelte';
// tokens.css and fonts.css are linked from index.html, where the loading screen needs them first.
import './styles/base.css';
import './styles/cursors.css';
import './styles/controls.css';
import App from './App.svelte';
import { discourageInspecting } from './lib/guard.js';
import { runLoader } from './lib/loader.js';
import { app } from './lib/state/app.svelte.js';

/** The page opens without the live seasons if they take longer than this (ms); the curve updates when they arrive. */
const SEASONS_PATIENCE = 4000;

discourageInspecting();
const seasons = app.refreshSeasons();

// The app is built behind the loading screen, with its entrance held until the screen opens.
mount(App, { target: document.getElementById('app') });

runLoader([Promise.race([seasons, new Promise((resolve) => setTimeout(resolve, SEASONS_PATIENCE))])]);
