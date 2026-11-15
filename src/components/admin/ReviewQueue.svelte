<!--
  Submissions waiting for a decision, and the history of past decisions.
  Each row shows the claim next to what the current curve says, so an
  outlier is obvious before it is approved.

  A submission's role was read off its screenshot without the visitor being
  asked. It is shown here to check against the screenshot and change, and
  one whose role could not be read has to be given one before it is approved.
-->
<script>
  import { flip } from 'svelte/animate';
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import ProofImage from '@/components/admin/ProofImage.svelte';
  import RankBadge from '@/components/RankBadge.svelte';
  import Select from '@/components/Select.svelte';
  import { ROLES, roleById } from '@/data/roles.js';
  import { runAdminAction, srOf, timeAgo } from '@/lib/admin.js';
  import { backend, SUBMISSION_STATUSES } from '@/lib/backend/index.js';
  import { formatSr } from '@/lib/format.js';
  import { dissolve, ms, slide } from '@/lib/motion.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  /** Percentage points between claim and curve: within CLOSE is fine, beyond FAR is suspicious. */
  const CLOSE = 1.5;
  const FAR = 6;

  let { onpendingcount } = $props();

  let status = $state('pending');
  let submissions = $state([]);
  let loading = $state(true);
  /** Id of the row with a request in flight. */
  let busyId = $state(null);
  /** Weight to give each submission if approved, by id. */
  let weights = $state({});
  /** The role chosen here for a submission, by id, where it is not the one read off its screenshot. */
  let roles = $state({});

  /** What stands in the role dropdown for a submission whose role could not be read. */
  const UNREAD = '';
  const ROLE_OPTIONS = ROLES.map((role) => ({ value: role.id, label: role.name }));
  const roleOf = (submission) => roles[submission.id] ?? submission.role ?? UNREAD;
  const roleOptions = (submission) =>
    submission.role ? ROLE_OPTIONS : [{ value: UNREAD, label: 'Not read' }, ...ROLE_OPTIONS];

  const seasonOf = (id) => app.seasons.find((season) => season.id === id);
  const seasonName = (id) => seasonOf(id)?.name ?? id;

  async function load() {
    loading = true;
    try {
      submissions = await backend.listSubmissions(status);
      if (status === 'pending') onpendingcount?.(submissions.length);
    } catch (error) {
      toasts.error(error.message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    status;
    load();
  });

  /** How a submission compares with the curve as it stands. */
  function assess(submission) {
    const season = seasonOf(submission.seasonId);
    // The rank is read on the ladder of the season it was submitted for.
    const ladder = app.ladderOf(season);
    const sr = srOf(submission, ladder);
    const model = season ? app.fitOf(season).model : null;
    if (sr === null) return { tier: null, label: 'Unknown rank', tone: 'bad' };
    const tier = ladder.divisionAt(sr).tier;
    const division = ladder.divisionAt(sr).number;
    if (!model) return { tier, division, label: 'No curve yet', tone: '' };

    const curve = model.cdf(sr) * 100;
    const gap = Math.abs(submission.betterThan - curve);
    return {
      tier,
      division,
      curve,
      label: gap <= CLOSE ? 'Matches curve' : gap <= FAR ? 'Some way off' : 'Far from curve',
      tone: gap <= CLOSE ? 'good' : gap <= FAR ? 'warn' : 'bad',
    };
  }

  async function act(submission, action, message) {
    busyId = submission.id;
    const ok = await runAdminAction(action, message);
    busyId = null;
    if (ok) {
      submissions = submissions.filter((item) => item.id !== submission.id);
      if (status === 'pending') onpendingcount?.(submissions.length);
    }
  }

  const approve = (s) =>
    act(
      s,
      () => backend.approveSubmission(s.id, weights[s.id] ?? 1, roleOf(s)),
      `${s.rank} added to ${seasonName(s.seasonId)}.`,
    );
  const deny = (s) => act(s, () => backend.denySubmission(s.id), 'Submission denied.');
  const remove = (s) => act(s, () => backend.deleteSubmission(s.id), 'Submission deleted.');
</script>

<div class="filters" role="tablist" aria-label="Submission status">
  {#each SUBMISSION_STATUSES as option (option)}
    <button type="button" role="tab" aria-selected={option === status} class:selected={option === status} onclick={() => (status = option)}>
      {option}
    </button>
  {/each}
</div>

{#if loading}
  <p class="empty">Loading…</p>
{:else if submissions.length === 0}
  <p class="empty" in:slide>
    {status === 'pending' ? 'Nothing waiting. New submissions will show up here.' : `No ${status} submissions.`}
  </p>
{:else}
  <ul class="queue">
    {#each submissions as submission (submission.id)}
      {@const verdict = assess(submission)}
      {@const busy = busyId === submission.id}
      <li class="row" class:busy animate:flip={{ duration: ms(260) }} in:slide out:dissolve>
        <div class="who">
          {#if verdict.tier}
            <RankBadge tier={verdict.tier} division={verdict.division} size={54} animated={false} />
          {/if}
          <div>
            <div class="display rank">{submission.rank}</div>
            <div class="meta">
              {#if status !== 'pending' && submission.role}{roleById(submission.role)?.name} · {/if}{#if submission.sr !== null && submission.sr !== undefined}{formatSr(submission.sr)} SR · {/if}{seasonName(submission.seasonId)} · {timeAgo(
                submission.createdAt,
              )}
            </div>
          </div>
        </div>

        <dl class="claim">
          <div>
            <dt class="eyebrow">Claims</dt>
            <dd class="display numeric">{submission.betterThan}%</dd>
          </div>
          <div>
            <dt class="eyebrow">Curve says</dt>
            <dd class="display numeric">{verdict.curve === undefined ? '—' : `${verdict.curve.toFixed(2)}%`}</dd>
          </div>
          <span class="chip {verdict.tone}">{verdict.label}</span>
        </dl>

        <ProofImage {submission} />

        <div class="decide">
          {#if status === 'pending'}
            <div
              class="role"
              title="The role this rank is held in, as read off the screenshot. Check it against the screenshot; one that could not be read has to be chosen."
            >
              <span class="eyebrow">Role</span>
              <Select
                compact
                label="Role"
                value={roleOf(submission)}
                options={roleOptions(submission)}
                onchange={(value) => (roles[submission.id] = value)}
              />
            </div>
            <label class="weight" title="How much this datapoint counts in a bell-curve fit, or against another at the same rank. 1 is normal.">
              <span class="eyebrow">Weight</span>
              <input
                class="input compact"
                type="number"
                min="0.1"
                step="0.1"
                value={weights[submission.id] ?? 1}
                oninput={(event) => (weights[submission.id] = Number(event.currentTarget.value) || 1)}
              />
            </label>
            <button
              type="button"
              class="btn small primary"
              disabled={busy || !verdict.tier || roleOf(submission) === UNREAD}
              title={roleOf(submission) === UNREAD ? 'Choose the role first.' : undefined}
              onclick={() => approve(submission)}
            >
              Approve
            </button>
            <button type="button" class="btn small danger" disabled={busy} onclick={() => deny(submission)}>Deny</button>
          {:else}
            <span class="chip {status === 'approved' ? 'good' : 'bad'}">
              {status} {submission.reviewedAt ? timeAgo(submission.reviewedAt) : ''}
            </span>
            <ConfirmButton disabled={busy} onconfirm={() => remove(submission)} />
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .filters {
    display: inline-flex;
    justify-self: start;
    padding: 2px;
    border: 1px solid var(--line);
    background: rgb(5 10 26 / 0.55);
  }

  .filters button {
    padding: 5px 14px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ice-300);
    transition:
      background 200ms,
      color 200ms;
  }

  .filters button:hover {
    color: var(--ice-50);
  }

  .filters button.selected {
    background: var(--ice-100);
    color: var(--navy-900);
  }

  .empty {
    padding: 28px 0;
    color: var(--ice-400);
  }

  .queue {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(170px, 1.2fr) minmax(250px, 1.5fr) auto auto;
    align-items: center;
    gap: 12px 20px;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-left: 3px solid var(--line-strong);
    background: rgb(13 21 52 / 0.7);
    transition:
      opacity 200ms,
      border-color 200ms;
  }

  .row:hover {
    border-left-color: var(--orange);
  }

  .row.busy {
    opacity: 0.5;
  }

  .who {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .rank {
    font-size: 24px;
    white-space: nowrap;
  }

  .meta {
    font-size: 11px;
    color: var(--ice-400);
    white-space: nowrap;
  }

  .claim {
    display: flex;
    align-items: center;
    gap: 18px;
    margin: 0;
  }

  .claim dt {
    font-size: 9px;
  }

  .claim dd {
    margin: 0;
    font-size: 24px;
  }

  .decide {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .role,
  .weight {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .role .eyebrow,
  .weight .eyebrow {
    font-size: 9px;
  }

  /* Wide enough for the longest role name. */
  .role :global(.trigger) {
    width: 112px;
  }

  .weight .input {
    width: 54px;
    text-align: center;
  }

  @media (max-width: 980px) {
    .row {
      grid-template-columns: 1fr 1fr;
    }

    .decide {
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
