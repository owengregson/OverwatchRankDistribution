<!--
  Page shell: backdrop, header, the current route's page, footer.
  Routes live behind the # (see lib/router.svelte.js).
-->
<script>
  import Backdrop from '@/components/Backdrop.svelte';
  import CustomCursor from '@/components/CustomCursor.svelte';
  import SiteFooter from '@/components/SiteFooter.svelte';
  import SiteHeader from '@/components/SiteHeader.svelte';
  import Toasts from '@/components/Toasts.svelte';
  import { router } from '@/lib/router.svelte.js';
  import { app } from '@/lib/state/app.svelte.js';
  import DistributionPage from '@/pages/DistributionPage.svelte';
  import SubmitPage from '@/pages/SubmitPage.svelte';

  /** Path → page. The admin panel is loaded only when someone opens it. */
  const ROUTES = {
    '': { page: DistributionPage, fitsScreen: true },
    submit: { page: SubmitPage },
    admin: { load: () => import('@/pages/AdminPage.svelte') },
  };

  const route = $derived(ROUTES[router.path] ?? ROUTES['']);
</script>

<!-- --tier carries the colour of the rank under the cursor to everything on the page. -->
<div class="app" class:fits-screen={route.fitsScreen} style:--tier={app.reading?.tier.color}>
  <Backdrop />
  <SiteHeader />

  {#key route}
    {#if route.page}
      <route.page />
    {:else}
      {#await route.load() then { default: Page }}
        <Page />
      {/await}
    {/if}
  {/key}

  <SiteFooter />
  <Toasts />
  <CustomCursor />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    transition: --tier 380ms var(--ease-out);
  }

  /* On wide screens the chart page fills exactly one viewport, with nothing to scroll. */
  @media (min-width: 1041px) {
    .fits-screen {
      height: 100dvh;
      min-height: 600px;
    }
  }
</style>
