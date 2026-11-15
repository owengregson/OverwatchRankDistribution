<script>
  import { backend } from '@/lib/backend/index.js';
  import { LOCAL_ADMIN_PASSWORD } from '@/lib/backend/localBackend.js';
  import { slide } from '@/lib/motion.js';

  let { onsignin } = $props();

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let failure = $state('');
  let form = $state();

  async function submit(event) {
    event.preventDefault();
    busy = true;
    failure = '';
    try {
      onsignin(await backend.signIn(email.trim(), password));
    } catch (error) {
      failure = error.message;
      password = '';
      form.animate(
        [0, -7, 6, -4, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 320, easing: 'ease-out' },
      );
    } finally {
      busy = false;
    }
  }
</script>

<section class="panel login rise" aria-labelledby="login-title">
  <p class="eyebrow">Restricted</p>
  <h1 id="login-title" class="display slanted">Admin sign in</h1>

  {#if backend.name === 'static'}
    <p class="note">This site is not connected to a database yet, so there is nothing to manage.</p>
  {:else}
    {#if backend.name === 'local'}
      <p class="note">
        Development mode: data is kept in this browser only. Sign in with any email and the password
        <code>{LOCAL_ADMIN_PASSWORD}</code>.
      </p>
    {/if}

    <form bind:this={form} onsubmit={submit}>
      <label class="field">
        <span class="label">Email</span>
        <input class="input" type="email" autocomplete="username" required bind:value={email} />
      </label>
      <label class="field">
        <span class="label">Password</span>
        <input class="input" type="password" autocomplete="current-password" required bind:value={password} />
      </label>

      {#if failure}
        <p class="failure" role="alert" in:slide>{failure}</p>
      {/if}

      <button type="submit" class="btn primary large" disabled={busy}>
        {#if busy}
          Signing in <span class="busy"><i></i><i></i><i></i></span>
        {:else}
          Sign in
        {/if}
      </button>
    </form>
  {/if}
</section>

<style>
  .login {
    display: grid;
    gap: 14px;
    width: min(440px, 100%);
    margin: 6vh auto 0;
    padding: 28px 30px 30px;
  }

  h1 {
    font-size: 48px;
    font-style: italic;
  }

  form {
    display: grid;
    gap: 16px;
  }

  .note {
    font-size: 12px;
    color: var(--ice-300);
    text-wrap: pretty;
  }

  code {
    padding: 1px 6px;
    background: rgb(160 185 255 / 0.14);
    color: var(--ice-50);
  }

  .failure {
    padding: 10px 14px;
    border-left: 3px solid var(--orange-hot);
    background: rgb(240 100 20 / 0.12);
  }
</style>
