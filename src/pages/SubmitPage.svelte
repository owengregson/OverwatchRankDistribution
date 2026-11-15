<!--
  Public form: tell us what share of players a rank beats this season.
  Submissions are stored as "pending" and only affect the curve once an
  admin approves them.
-->
<script>
  import ImageDrop from '@/components/ImageDrop.svelte';
  import RankBadge from '@/components/RankBadge.svelte';
  import RankPicker from '@/components/RankPicker.svelte';
  import { backend } from '@/lib/backend/index.js';
  import { pop, slide } from '@/lib/motion.js';
  import { href } from '@/lib/router.svelte.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  const STEPS = [
    { title: 'Submit', text: 'Pick the rank, enter the percentage the game shows, and attach a screenshot.' },
    { title: 'Review', text: 'Every submission is checked against its screenshot before it counts.' },
    { title: 'Refit', text: 'Once approved, the curve is refitted with your datapoint included.' },
  ];

  let seasonId = $state(app.seasonId);
  let tier = $state(ladder.tiers.find((t) => t.id === 'gold'));
  let number = $state(3);
  /** Number inputs bind to a number, or nothing when empty. */
  let betterThan = $state(null);
  /** The prepared screenshot (see ImageDrop), or null. */
  let proof = $state(null);

  let errors = $state({});
  let sending = $state(false);
  let failure = $state('');
  let sent = $state(false);
  let form = $state();

  const season = $derived(app.seasons.find((s) => s.id === seasonId) ?? app.season);
  const rankName = $derived(`${tier.name} ${number}`);
  const hasPercent = $derived(typeof betterThan === 'number' && betterThan > 0 && betterThan < 100);

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
      await backend.submitDatapoint({ seasonId: season.id, rank: rankName, betterThan, proof });
      sent = true;
    } catch (error) {
      failure = error.message;
    } finally {
      sending = false;
    }
  }

  function another() {
    betterThan = null;
    proof = null;
    errors = {};
    sent = false;
  }
</script>

<main style:--tier={tier.color}>
  <section class="panel card rise" aria-labelledby="submit-title">
    <div class="bar"></div>
    <p class="eyebrow">Help sharpen the curve</p>
    <h1 id="submit-title" class="display">Submit a <em>datapoint</em></h1>

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
        Know what share of players a rank beats this season? Send it in with a screenshot as proof. Each datapoint makes the curve
        more accurate for everyone.
      </p>

      <form bind:this={form} onsubmit={submit} novalidate>
        {#if app.seasons.length > 1}
          <label class="field">
            <span class="label">Season</span>
            <select class="input" bind:value={seasonId}>
              {#each app.seasons as option (option.id)}
                <option value={option.id}>{option.name}</option>
              {/each}
            </select>
          </label>
        {/if}

        <div class="field">
          <span class="label">Rank</span>
          <RankPicker {tier} {number} iconSize={34} onpick={(t, n) => ((tier = t), (number = n))} />
        </div>

        <label class="field">
          <span class="label">Better than</span>
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
              oninput={() => (errors.betterThan = '')}
              aria-invalid={Boolean(errors.betterThan)}
            />
            <span class="unit">% of players</span>
          </span>
          <span class="hint" class:error={errors.betterThan}>
            {errors.betterThan || `The share of players a ${rankName} player ranks above.`}
          </span>
        </label>

        <div class="field">
          <span class="label">Screenshot</span>
          <ImageDrop bind:value={proof} invalid={Boolean(errors.proof)} onchange={() => (errors.proof = '')} />
          {#if errors.proof}
            <span class="hint error">{errors.proof}</span>
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
        <RankBadge {tier} division={number} size={96} />
        <div>
          <div class="display rank">{rankName}</div>
          <p class="sentence">
            is better than
            {#key hasPercent ? betterThan : null}
              <b class="display figure" in:pop={{ from: 0.8 }}>{hasPercent ? `${betterThan}%` : '?'}</b>
            {/key}
            of players
          </p>
          <p class="eyebrow">{season.name}</p>
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
    gap: 18px;
    margin-top: 6px;
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
    min-height: 46px;
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
