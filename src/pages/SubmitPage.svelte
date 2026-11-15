<!--
  Public form: tell us what share of players a rank beats this season.
  Submissions are stored as "pending" and only affect the curve once an
  admin approves them.

  The form starts with the screenshot. The rest (rank, division, rank
  progress, percentage) stays greyed out until there is one, and is filled
  in from it where it can be read: the screenshot is looked at on the
  visitor's own computer (see lib/screenshot), so nothing is sent anywhere
  until they submit.
-->
<script>
  import { onDestroy } from 'svelte';
  import ImageDrop from '@/components/ImageDrop.svelte';
  import RankBadge from '@/components/RankBadge.svelte';
  import RankPicker from '@/components/RankPicker.svelte';
  import Select from '@/components/Select.svelte';
  import Slider from '@/components/Slider.svelte';
  import { backend } from '@/lib/backend/index.js';
  import { formatSr } from '@/lib/format.js';
  import { dissolve, pop, slide } from '@/lib/motion.js';
  import { href } from '@/lib/router.svelte.js';
  import { srAt } from '@/lib/screenshot/parse.js';
  import { app } from '@/lib/state/app.svelte.js';

  const STEPS = [
    { title: 'Submit', text: 'Add a screenshot of your rank screen. The rank and percentages are read from it for you to check.' },
    { title: 'Review', text: 'Every submission is checked against its screenshot before it counts.' },
    { title: 'Refit', text: 'Once approved, the curve is refitted with your datapoint included.' },
  ];

  /** The tier the form starts on, and falls back to if the chosen season's ladder lacks the one picked. */
  const STARTING_TIER = 'gold';
  /** Rank progress before anything is known: the middle of the division. */
  const STARTING_PROGRESS = 50;
  /** How long (ms) the screenshot reader gets before the visitor is left to fill the form in by hand. */
  const READ_TIMEOUT = 30000;
  /** What each thing read from a screenshot is called in the note under it. */
  const READ_NAMES = { rank: 'the rank', progress: 'the rank progress', betterThan: 'the percentage' };
  /** What is written beside a detail that still needs the visitor. */
  const FLAG_TEXT = { missing: 'Not read · fill this in', unsure: 'Hard to read · check this' };

  let seasonId = $state(app.seasonId);
  let tierId = $state(STARTING_TIER);
  let number = $state(3);
  /** How far through the division, 0 to 100: the game's "Rank progress". */
  let progress = $state(STARTING_PROGRESS);
  /** Number inputs bind to a number, or nothing when empty. */
  let betterThan = $state(null);
  /** The prepared screenshot (see ImageDrop), or null. */
  let proof = $state(null);

  /** True while ImageDrop is preparing a newly chosen image. */
  let preparing = $state(false);
  /** Reading the screenshot: 'none' with no image, 'reading' while it is looked at, 'done' after. */
  let reading = $state('none');
  /** After a reading: the details filled in from it, those it could not find, and those it was unsure of. */
  let read = $state({ found: [], missing: [], unsure: [] });
  /**
   * The details that still need the visitor after a reading, by field:
   * 'missing' for one the screenshot did not give up, 'unsure' for one that
   * was hard to make out. Each is marked on the form until it is touched.
   */
  let flags = $state({});
  /** Counts readings, so one that finishes after its image was replaced or removed is ignored. */
  let readRun = 0;
  /** Shuts the reader down; set once it has been loaded. */
  let stopReader = null;

  let errors = $state({});
  let sending = $state(false);
  let failure = $state('');
  let sent = $state(false);
  let form = $state();

  const season = $derived(app.seasons.find((s) => s.id === seasonId) ?? app.season);
  // The ranks on offer are those of the chosen season's ladder, which may not be the one on the chart.
  const tiers = $derived(app.ladderOf(season).tiers);
  const tier = $derived(tiers.find((t) => t.id === tierId) ?? tiers.find((t) => t.id === STARTING_TIER));
  const rankName = $derived(`${tier.name} ${number}`);
  const division = $derived(tier.divisions.find((d) => d.number === number) ?? tier.divisions[0]);
  /** The exact SR the datapoint is for: the rank progress, measured along the division. */
  const sr = $derived(srAt(division, progress));
  const hasPercent = $derived(typeof betterThan === 'number' && betterThan > 0 && betterThan < 100);
  /** A screenshot has been chosen and is being prepared, then read. */
  const processing = $derived(preparing || reading === 'reading');
  /** The details cannot be touched until there is a screenshot and it has been read. */
  const locked = $derived(!proof || processing);

  /** "a", "a and b", "a, b and c" */
  const listed = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(''));
  const named = (fields) => listed(fields.map((field) => READ_NAMES[field]));

  /** What the note beside the screenshot says. */
  const note = $derived.by(() => {
    if (reading !== 'done') return 'Reading the rank, rank progress and percentage…';
    const { found, missing, unsure } = read;
    if (!found.length) return 'Could not read this screenshot. Fill in the details below.';
    if (missing.length) return `Could not read ${named(missing)}. Fill ${missing.length > 1 ? 'them' : 'it'} in below.`;
    if (unsure.length) return `Filled in below, but ${named(unsure)} ${unsure.length > 1 ? 'were' : 'was'} hard to make out.`;
    return 'Filled in below. Check it matches before you send it.';
  });

  /** The label beside the screenshot's preview. */
  const chip = $derived.by(() => {
    if (reading === 'reading') return { text: 'Reading…', tone: '' };
    if (reading === 'done' && read.found.length && !read.missing.length && !read.unsure.length) {
      return { text: 'Details read', tone: 'good' };
    }
    if (reading === 'done') return { text: 'Check the details', tone: 'warn' };
    return { text: 'Ready to send', tone: 'good' };
  });

  /**
   * A screenshot was added, replaced or removed. A new one is read, and the
   * details it shows are filled in before the form is unlocked.
   */
  async function onimage(file) {
    errors.proof = '';
    const run = ++readRun;
    flags = {};
    if (!file) {
      reading = 'none';
      return;
    }

    reading = 'reading';
    let result = null;
    try {
      // The reader is large, so it is only loaded once there is something to read.
      const reader = await import('@/lib/screenshot/readRankScreen.js');
      stopReader = reader.stopReading;
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Reading the screenshot took too long.')), READ_TIMEOUT);
      });
      result = await Promise.race([reader.readRankScreen(file, app.ladderOf(season)), timeout]).finally(() => clearTimeout(timer));
    } catch (error) {
      // Not fatal: the details can always be filled in by hand. A reader that hung is shut down.
      console.warn('Could not read the screenshot.', error);
      stopReader?.();
    }
    if (run !== readRun) return;

    const found = [];
    if (result?.tier && result.number) {
      tierId = result.tier.id;
      number = result.number;
      found.push('rank');
    }
    if (typeof result?.progress === 'number') {
      progress = result.progress;
      found.push('progress');
    }
    if (typeof result?.betterThan === 'number') {
      betterThan = result.betterThan;
      errors.betterThan = '';
      found.push('betterThan');
    }
    read = {
      found,
      missing: Object.keys(READ_NAMES).filter((field) => !found.includes(field)),
      unsure: (result?.unsure ?? []).filter((field) => found.includes(field)),
    };
    flags = Object.fromEntries([
      ...read.missing.map((field) => [field, 'missing']),
      ...read.unsure.map((field) => [field, 'unsure']),
    ]);
    reading = 'done';
  }

  /** The visitor has dealt with a detail: it no longer needs marking. */
  const settled = (field) => delete flags[field];

  onDestroy(() => stopReader?.());

  function validate() {
    const found = {};
    if (!hasPercent) found.betterThan = 'Enter a percentage between 0 and 100.';
    if (!proof) found.proof = 'Add a screenshot that shows the percentage.';
    errors = found;
    return Object.keys(found).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    failure = '';
    if (!validate()) {
      form.animate(
        [0, -7, 6, -4, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 320, easing: 'ease-out' },
      );
      return;
    }

    sending = true;
    try {
      await backend.submitDatapoint({ seasonId: season.id, rank: rankName, sr, betterThan, proof });
      sent = true;
    } catch (error) {
      failure = error.message;
    } finally {
      sending = false;
    }
  }

  function another() {
    readRun += 1;
    reading = 'none';
    flags = {};
    betterThan = null;
    progress = STARTING_PROGRESS;
    proof = null;
    errors = {};
    sent = false;
  }
</script>

<main style:--tier={tier.color}>
  <section class="panel card rise" aria-labelledby="submit-title">
    <div class="bar"></div>
    <p class="eyebrow">Help sharpen the curve</p>
    <h1 id="submit-title" class="display slanted">Submit a <em>datapoint</em></h1>

    {#if !backend.canSubmit}
      <p class="lede">Submissions are not open yet. Check back soon.</p>
      <a class="btn" href={href('')}>Back to the curve</a>
    {:else if sent}
      <div class="done" in:slide>
        <svg class="tick" viewBox="0 0 64 64" aria-hidden="true">
          <path class="ring" d="M32 4 60 32 32 60 4 32Z" />
          <path class="check" d="M20 33l8 8 16-17" />
        </svg>
        <h2 class="display">Sent for review</h2>
        <p class="lede">
          Thanks. Your {rankName} datapoint is in the queue and will shape the {season.name} curve once it is approved.
        </p>
        <div class="actions">
          <button type="button" class="btn primary" onclick={another}>Submit another</button>
          <a class="btn" href={href('')}>Back to the curve</a>
        </div>
      </div>
    {:else}
      <p class="lede">
        Know what share of players your rank beats? Send in a screenshot of the rank screen that shows it. Each datapoint makes
        the curve more accurate.
      </p>

      <form bind:this={form} onsubmit={submit} novalidate>
        <div class="field">
          <span class="label">Screenshot</span>
          <ImageDrop
            bind:value={proof}
            bind:busy={preparing}
            invalid={Boolean(errors.proof)}
            {chip}
            {note}
            fine="PNG, JPEG or WebP of your rank screen. It is read on your device to fill in the form below."
            onchange={onimage}
          />
          {#if errors.proof}
            <span class="hint error">{errors.proof}</span>
          {/if}
        </div>

        {#if app.seasons.length > 1}
          <div class="field inline">
            <span class="label">Season</span>
            <Select bind:value={seasonId} label="Season" options={app.seasons.map((s) => ({ value: s.id, label: s.name }))} />
          </div>
        {/if}

        <!-- Greyed out and out of reach until a screenshot has been added and read; covered while it is being read. -->
        <div class="details-area">
        <div class="details" class:locked inert={locked}>
          <!-- A detail the screenshot did not give up, or gave up unclearly, is marked until the visitor touches it. -->
          <div class="field" class:flagged={flags.rank}>
            <span class="label">
              Rank and division
              {#if flags.rank}<span class="chip warn" in:pop>{FLAG_TEXT[flags.rank]}</span>{/if}
            </span>
            <RankPicker
              {tier}
              {number}
              {tiers}
              iconSize={42}
              onpick={(t, n) => {
                tierId = t.id;
                number = n;
                settled('rank');
              }}
            />
          </div>

          <div class="field" class:flagged={flags.progress}>
            <!-- The "Rank progress" figure on the screen: how far through the division, which gives the exact SR. -->
            <span class="label split">
              <span class="named">
                Rank progress
                {#if flags.progress}<span class="chip warn" in:pop>{FLAG_TEXT[flags.progress]}</span>{/if}
              </span>
              <span class="numeric">{rankName} at {progress}% is {formatSr(sr)} SR</span>
            </span>
            <Slider bind:value={progress} label="Rank progress, percent" oninput={() => settled('progress')} />
          </div>

          <label class="field" class:flagged={flags.betterThan}>
            <span class="label">
              Better than
              {#if flags.betterThan}<span class="chip warn" in:pop>{FLAG_TEXT[flags.betterThan]}</span>{/if}
            </span>
            <span class="percent">
              <input
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 97"
                bind:value={betterThan}
                oninput={() => {
                  errors.betterThan = '';
                  settled('betterThan');
                }}
                aria-invalid={Boolean(errors.betterThan)}
              />
              <span class="unit">% of players</span>
            </span>
            <span class="hint" class:error={errors.betterThan}>
              {errors.betterThan ||
                (flags.betterThan === 'missing'
                  ? 'Could not read it. Enter the "Higher ranked than" figure from the screen.'
                  : 'The "Higher ranked than" figure on the screen.')}
            </span>
          </label>
        </div>

          {#if processing}
            <div class="reading" role="status" transition:dissolve>
              <span class="scan" aria-hidden="true"></span>
              <span class="display slanted">Reading your screenshot</span>
              <span class="progress" aria-hidden="true"><i></i></span>
              <span class="eyebrow">On your device · nothing is sent yet</span>
            </div>
          {/if}
        </div>

        {#if failure}
          <p class="failure" role="alert" in:slide>Could not send that: {failure}</p>
        {/if}

        <button type="submit" class="btn primary large" disabled={sending}>
          {#if sending}
            Sending <span class="busy"><i></i><i></i><i></i></span>
          {:else}
            Submit for review
          {/if}
        </button>
      </form>
    {/if}
  </section>

  <aside class="aside">
    <section class="panel preview rise" style:--i={1} aria-label="Preview">
      <p class="eyebrow">Your datapoint</p>
      <div class="claim">
        <RankBadge {tier} division={number} size={118} />
        <div>
          <div class="display rank">{rankName}</div>
          <p class="sentence">
            is better than
            {#key hasPercent ? betterThan : null}
              <b class="display figure" in:pop={{ from: 0.8 }}>{hasPercent ? `${betterThan}%` : '?'}</b>
            {/key}
            of players
          </p>
          <p class="eyebrow">{season.name} · {formatSr(sr)} SR</p>
        </div>
      </div>
    </section>

    <ol class="steps">
      {#each STEPS as step, i}
        <li class="panel rise" style:--i={i + 2}>
          <span class="display index">{i + 1}</span>
          <div>
            <h3 class="display">{step.title}</h3>
            <p>{step.text}</p>
          </div>
        </li>
      {/each}
    </ol>
  </aside>
</main>

<style>
  main {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: start;
    gap: var(--gutter);
    width: min(1120px, 100%);
    margin-inline: auto;
    padding: calc(var(--gutter) * 1.6) var(--gutter) var(--gutter);
    transition: --tier 380ms var(--ease-out);
  }

  .card {
    display: grid;
    gap: 14px;
    padding: 28px 30px 30px;
  }

  .bar {
    position: absolute;
    inset: 0 0 auto var(--chamfer);
    height: 3px;
    background: linear-gradient(90deg, var(--tier), transparent 85%);
  }

  h1 {
    font-size: clamp(44px, 5vw, 68px);
    font-style: italic;
  }

  h1 em {
    font-style: inherit;
    color: var(--tier);
    text-shadow: 0 0 34px color-mix(in srgb, var(--tier) 50%, transparent);
  }

  .lede {
    max-width: 56ch;
    color: var(--ice-300);
    text-wrap: pretty;
  }

  form {
    display: grid;
    gap: 14px;
    margin-top: 4px;
  }

  /* A field with its label and control side by side. */
  .field.inline {
    grid-template-columns: auto minmax(0, 320px);
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  /* A label with a figure at the far end of its line. */
  .label.split {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .label.split .numeric {
    letter-spacing: 0.06em;
    color: var(--ice-400);
  }

  .details-area {
    position: relative;
  }

  .details {
    display: grid;
    gap: 14px;
    transition: opacity 240ms;
  }

  /* Each label line is tall enough for a flag beside it, so nothing moves when one appears. */
  .details .label,
  .details .named {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 18px;
  }

  /*
   * A detail that still needs the visitor: an orange frame around the whole
   * field. The frame is drawn outside the field and takes no room, and lets
   * clicks through to the controls under it.
   */
  .field.flagged {
    position: relative;
  }

  .field.flagged::after {
    content: '';
    position: absolute;
    inset: -7px -9px;
    border: 1px solid var(--orange-hot);
    border-left-width: 3px;
    background: rgb(240 100 20 / 0.07);
    pointer-events: none;
    animation: flag 1400ms var(--ease-out);
  }

  /* It arrives with a pulse, to catch the eye once. */
  @keyframes flag {
    0% {
      opacity: 0;
      box-shadow: 0 0 0 0 rgb(255 131 54 / 0.7);
    }
    25% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgb(255 131 54 / 0.7);
    }
    100% {
      box-shadow: 0 0 0 12px rgb(255 131 54 / 0);
    }
  }

  .field.flagged .percent .input {
    border-color: var(--orange-hot);
  }

  /* Laid over the greyed-out details while the screenshot is prepared and read. */
  .reading {
    --cursor: default;
    cursor: default;
    position: absolute;
    inset: -8px;
    z-index: 1;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 10px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: rgb(8 14 36 / 0.62);
    backdrop-filter: blur(3px);
    text-align: center;
    user-select: none;
  }

  .reading .display {
    font-size: 30px;
    font-style: italic;
    color: var(--ice-50);
  }

  .reading .eyebrow {
    font-size: 10px;
  }

  /* A band of light that sweeps down the area, as if scanning it. */
  .scan {
    position: absolute;
    inset: 0 0 auto;
    height: 42%;
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--tier) 16%, transparent) 85%, var(--tier));
    border-bottom: 1px solid var(--tier);
    opacity: 0.55;
    animation: scan 1500ms var(--ease-in-out) infinite;
  }

  @keyframes scan {
    from {
      translate: 0 -100%;
    }
    to {
      translate: 0 240%;
    }
  }

  /* A slanted bar with a block that runs along it for as long as the reading takes. */
  .progress {
    position: relative;
    width: min(240px, 70%);
    height: 6px;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    background: rgb(5 10 26 / 0.6);
    transform: skewX(-18deg);
  }

  .progress i {
    position: absolute;
    inset: 0 auto 0 0;
    width: 38%;
    background: var(--tier);
    box-shadow: 0 0 12px var(--tier);
    animation: run 1100ms var(--ease-in-out) infinite;
  }

  @keyframes run {
    from {
      translate: -110% 0;
    }
    to {
      translate: 290% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scan {
      animation: none;
      opacity: 0;
    }

    .progress i {
      animation-duration: 2600ms;
    }
  }

  /* Waiting for a screenshot: dimmed, and nothing in it can be selected or shows a hand. */
  .details.locked {
    --cursor: default;
    cursor: default;
    opacity: 0.65;
    user-select: none;
  }

  .percent {
    display: grid;
    grid-template-columns: minmax(0, 160px) auto;
    align-items: center;
    justify-content: start;
    gap: 12px;
  }

  .percent .input {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 26px;
    min-height: 42px;
  }

  .unit {
    color: var(--ice-300);
  }

  .failure {
    padding: 10px 14px;
    border-left: 3px solid var(--orange-hot);
    background: rgb(240 100 20 / 0.12);
    color: var(--ice-100);
  }

  .btn.large {
    justify-self: start;
  }

  .done {
    display: grid;
    justify-items: start;
    gap: 12px;
    padding-top: 6px;
  }

  .done h2 {
    font-size: 40px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
  }

  /* The tick draws itself: ring first, then the check. */
  .tick {
    width: 72px;
    height: 72px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .ring {
    stroke: #35d695;
    stroke-width: 3;
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    animation: draw 600ms var(--ease-out) forwards;
  }

  .check {
    stroke: var(--ice-50);
    stroke-width: 5;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: draw 400ms var(--ease-out) 380ms forwards;
  }

  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  .aside {
    display: grid;
    gap: var(--gutter);
    min-width: 0;
  }

  .preview {
    display: grid;
    gap: 14px;
    padding: 20px 24px 22px;
  }

  .claim {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .rank {
    font-size: 40px;
    font-style: italic;
    color: var(--tier);
  }

  .sentence {
    margin: 4px 0 8px;
    color: var(--ice-300);
  }

  .figure {
    display: inline-block;
    margin: 0 4px;
    font-size: 30px;
    color: var(--ice-50);
    vertical-align: -4px;
  }

  .steps {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .steps li {
    --cut: 10px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
  }

  .index {
    font-size: 44px;
    color: var(--orange);
  }

  .steps h3 {
    font-size: 24px;
  }

  .steps p {
    font-size: 12px;
    color: var(--ice-300);
    text-wrap: pretty;
  }

  @media (max-width: 860px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }

    .card {
      padding: 22px 20px 24px;
    }
  }
</style>
