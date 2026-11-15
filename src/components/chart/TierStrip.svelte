<!-- Tier icons under the axis, each centred on its SR range. Click one to travel there. -->
<script>
  import RankBadge from '@/components/RankBadge.svelte';
  import { formatPercent } from '@/lib/format.js';
  import { clamp } from '@/lib/math/util.js';
  import { tierShares } from '@/lib/model/reading.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  let { padding, plotWidth } = $props();

  const shares = $derived(tierShares(app.model, ladder));
  const activeId = $derived(app.reading.tier.id);

  // A standard tier is a tenth of the axis; keep icons inside their column.
  const columnWidth = $derived(((plotWidth - padding.left - padding.right) * 500) / ladder.maxSr);
  const iconSize = $derived(clamp(columnWidth * 0.62, 20, 60));
  const compact = $derived(columnWidth < 64);

  function visit(tier) {
    app.probe.glide(tier.midSr);
  }
</script>

<div class="strip" style:padding-inline="{padding.left}px {padding.right}px" class:compact>
  <div class="track">
    {#each shares as { tier, share } (tier.id)}
      <button
        type="button"
        class="tier"
        class:active={tier.id === activeId}
        style:left="{(tier.midSr / ladder.maxSr) * 100}%"
        style:--color={tier.color}
        style:--i={tier.index}
        onclick={() => visit(tier)}
        aria-label="{tier.name}: {ladder.rangeLabel(tier)} SR, {formatPercent(share)} of players. Go to {tier.name}."
      >
        <span class="icon">
          <RankBadge {tier} size={iconSize} align="center" animated={false} />
        </span>
        <span class="display name">{tier.name}</span>
        <span class="numeric share">{formatPercent(share)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .strip {
    padding-block: 6px 2px;
  }

  .track {
    position: relative;
    height: 104px;
  }

  .compact .track {
    height: 62px;
  }

  .tier {
    position: absolute;
    top: 0;
    display: grid;
    justify-items: center;
    gap: 1px;
    padding: 4px 6px 6px;
    translate: -50% 0;
    opacity: 0.62;
    transition:
      opacity 260ms var(--ease-out),
      transform 320ms var(--ease-back);
    animation: tier-in 620ms var(--ease-back) backwards;
    animation-delay: calc(var(--i) * 70ms + 500ms);
  }

  .tier::after {
    content: '';
    position: absolute;
    inset: auto 18% 0;
    height: 2px;
    background: var(--color);
    scale: 0 1;
    transition: scale 320ms var(--ease-out);
  }

  .tier:hover,
  .tier:focus-visible {
    opacity: 1;
    transform: translateY(-3px);
  }

  .tier.active {
    opacity: 1;
    transform: translateY(-4px) scale(1.14);
  }

  .tier.active::after {
    scale: 1 1;
  }

  .icon {
    transition: filter 320ms var(--ease-out);
  }

  .active .icon,
  .tier:hover .icon {
    filter: drop-shadow(0 0 12px color-mix(in srgb, var(--color) 70%, transparent));
  }

  .name {
    margin-top: 5px;
    font-size: 17px;
    color: var(--ice-200);
    transition: color 260ms;
  }

  .active .name {
    color: var(--color);
  }

  .share {
    font-size: 10px;
    color: var(--ice-400);
  }

  .compact .name,
  .compact .share {
    display: none;
  }

  @keyframes tier-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.6);
    }
  }
</style>
