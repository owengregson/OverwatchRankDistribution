import { mount } from 'svelte';
// tokens.css and fonts.css are linked from index.html, where the loading screen needs them first.
import './styles/base.css';
import './styles/cursors.css';
import './styles/controls.css';
import App from './App.svelte';
import { discourageInspecting } from './lib/guard.js';
import { runLoader } from './lib/loader.js';
import { download as downloadReader } from './lib/screenshot/ocr.js';
import { app } from './lib/state/app.svelte.js';

/** The page opens without the live seasons if they take longer than this (ms); the curve updates when they arrive. */
const SEASONS_PATIENCE = 4000;

discourageInspecting();
const seasons = app.refreshSeasons();

// The text summary at the end of index.html is out of sight while the app
// runs (styles/summary.css). Keep the Tab key out of it too, so focus never
// lands on a link nobody can see; screen readers still reach its links.
for (const link of document.querySelectorAll('.site-summary a')) link.tabIndex = -1;

// The app is built behind the loading screen, with its entrance held until the screen opens.
mount(App, { target: document.getElementById('app') });

const opened = runLoader([Promise.race([seasons, new Promise((resolve) => setTimeout(resolve, SEASONS_PATIENCE))])]);

// The screenshot reader's files (about 7 MB) are fetched in the background on
// every page, so they are already here when someone goes to submit. Not a
// step of the loading screen: they start once the page has opened, and never
// compete with what it draws with. A visitor who has asked their browser to
// save data is spared them until the submit page needs them.
opened.then(() => {
  if (!navigator.connection?.saveData) downloadReader();
});
