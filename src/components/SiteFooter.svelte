<script>
  import { AUTHOR } from '@/config.js';
</script>

<footer>
  <span class="credit">
    made with <span class="heart" role="img" aria-label="love">❤️</span> by
    <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer">{AUTHOR.handle}</a>
  </span>
  <!-- Static pages built by scripts/site (relative: the site may live under a sub-path). -->
  <nav class="links" aria-label="Guides">
    <a href="articles/">Rank distribution guides</a>
    <a href="articles/faq/">FAQ</a>
  </nav>
  <span>Unofficial fan project, not affiliated with Blizzard Entertainment.</span>
</footer>

<style>
  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 24px;
    padding: 10px calc(var(--gutter) + 4px) 12px;
    font-size: 11px;
    color: var(--ice-500);
  }

  .credit {
    color: var(--ice-400);
  }

  .links {
    display: flex;
    gap: 16px;
  }

  .heart {
    display: inline-block;
    animation: heartbeat 1.6s ease-in-out infinite;
  }

  /* Underline that draws in from the left on hover. */
  a {
    color: var(--ice-100);
    text-decoration: none;
    background: linear-gradient(var(--orange), var(--orange)) left bottom / 0 2px no-repeat;
    transition:
      color 200ms,
      background-size 300ms var(--ease-out);
  }

  a:hover {
    color: var(--orange-hot);
    background-size: 100% 2px;
  }

  @keyframes heartbeat {
    0%,
    40%,
    100% {
      scale: 1;
    }
    15% {
      scale: 1.3;
    }
    28% {
      scale: 1.12;
    }
  }
</style>
