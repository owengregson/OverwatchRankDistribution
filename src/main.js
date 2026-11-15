import { mount } from 'svelte';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/cursors.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
