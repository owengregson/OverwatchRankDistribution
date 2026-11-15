<!-- "Find my rank": send the cursor to an SR, a percentile, or a rank. -->
<script>
  import RankPicker from '@/components/RankPicker.svelte';
  import { slide } from '@/lib/motion.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';
  import { FINDER_INPUT_ID, FINDER_PANEL_ID } from '@/lib/ui.js';

  /**
   * Each numeric mode turns what was typed into an SR, or explains why it can't.
   * Add a mode here and it gets a tab.
   */
  const MODES = [
    {
      id: 'sr',
      label: 'SR',
      placeholder: 'e.g. 3245',
      suffix: 'SR',
      step: 1,
      max: ladder.maxSr,
      toSr: (value) => value,
      hint: `Enter a skill rating from 0 to ${ladder.maxSr}.`,
    },
    {
      id: 'percentile',
      label: 'Percent',
      placeholder: 'e.g. 90',
      suffix: '%',
      step: 0.1,
      max: 100,
      toSr: (value) => app.model.quantile(value / 100),
      hint: 'Enter the share of players to beat, from 0 to 100.',
    },
    { id: 'rank', label: 'Rank' },
  ];

  let modeId = $state('sr');
  /** A number input binds to a number, or nothing when it is empty. */
  let entry = $state(null);
  let error = $state('');
  let form = $state();

  const mode = $derived(MODES.find((m) => m.id === modeId));
  const modeIndex = $derived(MODES.indexOf(mode));
  const current = $derived(app.reading.division);

  function setMode(id) {
    modeId = id;
    entry = null;
    error = '';
  }

  function submit(event) {
    event.preventDefault();
    const value = typeof entry === 'number' ? entry : NaN;
    if (!Number.isFinite(value) || value < 0 || value > mode.max) {
      error = mode.hint;
      form.animate(
        [0, -7, 6, -4, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 320, easing: 'ease-out' },
      );
      return;
    }
    error = '';
    app.probe.glide(mode.toSr(value));
  }

  /**
   * Go to the middle of a division. Aiming at the middle rather than the
   * entry SR means the readout lands on the chosen rank straight away
   * instead of creeping up to its boundary.
   */
  function goToRank(tier, number) {
    app.probe.goTo(tier.divisions.find((d) => d.number === number).midSr);
  }
</script>

<section class="panel finder" id={FINDER_PANEL_ID}>
  <header>
    <h2 class="display title">Find my rank</h2>
    <div class="tabs" role="tablist" aria-label="Find by" style:--index={modeIndex} style:--count={MODES.length}>
      <span class="thumb"></span>
      {#each MODES as m (m.id)}
        <button
          type="button"
          role="tab"
          aria-selected={m.id === modeId}
          class:selected={m.id === modeId}
          onclick={() => setMode(m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>
  </header>

  {#if mode.id === 'rank'}
    <div in:slide>
      <RankPicker tier={current.tier} number={current.number} onpick={goToRank} />
    </div>
  {:else}
    <form bind:this={form} onsubmit={submit} novalidate in:slide>
      <label class="field" class:invalid={error}>
        <span class="visually-hidden">{mode.label}</span>
        <input
          id={FINDER_INPUT_ID}
          class="display numeric"
          type="number"
          inputmode="decimal"
          min="0"
          max={mode.max}
          step={mode.step}
          placeholder={mode.placeholder}
          autocomplete="off"
          bind:value={entry}
          oninput={() => (error = '')}
          aria-invalid={Boolean(error)}
          aria-describedby="finder-message"
        />
        <span class="suffix">{mode.suffix}</span>
      </label>
      <button type="submit" class="display go">Locate</button>
    </form>
    <p id="finder-message" class="message" class:error role={error ? 'alert' : undefined}>
      {error || mode.hint}
    </p>
  {/if}
</section>

<style>
  .finder {
    display: grid;
    gap: 10px;
    padding: 13px 20px 13px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }

  .title {
    font-size: 26px;
    font-style: italic;
    white-space: nowrap;
  }

  /* Segmented control with a thumb that slides to the selected tab. */
  .tabs {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--count), minmax(0, 1fr));
    width: 186px;
    flex: none;
    padding: 2px;
    background: rgb(5 10 26 / 0.55);
    border: 1px solid var(--line);
  }

  .thumb {
    position: absolute;
    inset: 2px auto 2px 2px;
    width: calc((100% - 4px) / var(--count));
    translate: calc(var(--index) * 100%) 0;
    background: var(--ice-100);
    transition: translate 320ms var(--ease-out);
  }

  .tabs button {
    position: relative;
    padding: 4px 0;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ice-300);
    transition: color 200ms;
  }

  .tabs button:hover {
    color: var(--ice-50);
  }

  .tabs button.selected {
    color: var(--navy-900);
  }

  form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .field {
    position: relative;
    display: flex;
    align-items: center;
    background: rgb(5 10 26 / 0.55);
    border: 1px solid var(--line-strong);
    transition:
      border-color 200ms,
      box-shadow 200ms;
  }

  .field:focus-within {
    border-color: var(--ice-100);
    box-shadow: 0 0 0 3px rgb(160 185 255 / 0.16);
  }

  .field.invalid {
    border-color: var(--orange-hot);
  }

  input {
    width: 100%;
    min-width: 0;
    padding: 6px 4px 4px 12px;
    border: 0;
    outline: 0;
    background: none;
    font-size: 28px;
    color: var(--ice-50);
    appearance: textfield;
    -moz-appearance: textfield;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    appearance: none;
    margin: 0;
  }

  input::placeholder {
    color: var(--ice-500);
  }

  .suffix {
    padding-right: 12px;
    font-size: 12px;
    letter-spacing: 0.1em;
    color: var(--ice-400);
  }

  /* Orange call-to-action with a light sweep on hover. */
  .go {
    position: relative;
    overflow: hidden;
    padding: 4px 20px 2px;
    border-radius: var(--radius);
    background: var(--orange);
    color: #fff;
    font-size: 24px;
    transition:
      background 180ms,
      transform 180ms var(--ease-back);
  }

  .go::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.45) 50%, transparent 65%);
    translate: -110% 0;
  }

  .go:hover {
    background: var(--orange-hot);
    transform: translateY(-1px);
  }

  .go:hover::after {
    translate: 110% 0;
    transition: translate 600ms var(--ease-out);
  }

  .go:active {
    transform: translateY(1px) scale(0.98);
  }

  .message {
    font-size: 11px;
    color: var(--ice-400);
  }

  .message.error {
    color: var(--orange-hot);
  }
</style>
