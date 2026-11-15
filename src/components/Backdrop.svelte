<!--
  Decorative page background: deep navy light, angular shards drifting
  slowly, and a glow that takes on the colour of the rank being inspected.
-->
<div class="backdrop" aria-hidden="true">
  <div class="aura"></div>
  <div class="shard one"></div>
  <div class="shard two"></div>
  <div class="shard three"></div>
  <div class="dots"></div>
  <div class="frame"></div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background:
      radial-gradient(1100px 620px at 78% -8%, #2c428f 0%, transparent 62%),
      radial-gradient(900px 600px at 0% 100%, #16255a 0%, transparent 60%),
      linear-gradient(180deg, #0f1a3f 0%, #080e24 100%);
  }

  .aura {
    position: absolute;
    left: 58%;
    top: 46%;
    width: 900px;
    aspect-ratio: 1;
    translate: -50% -50%;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--tier) 20%, transparent), transparent);
    animation: breathe 9s ease-in-out infinite;
  }

  .shard {
    position: absolute;
    background: linear-gradient(180deg, rgb(120 150 255 / 0.1), transparent);
    animation: drift 22s ease-in-out infinite alternate;
  }

  .one {
    left: -6%;
    top: -10%;
    width: 46%;
    height: 80%;
    clip-path: polygon(0 0, 100% 0, 62% 100%, 0 78%);
  }

  .two {
    right: -8%;
    top: 22%;
    width: 38%;
    height: 90%;
    clip-path: polygon(38% 0, 100% 12%, 100% 100%, 0 100%);
    background: linear-gradient(200deg, rgb(120 150 255 / 0.08), transparent 70%);
    animation-duration: 28s;
    animation-direction: alternate-reverse;
  }

  .three {
    left: 30%;
    bottom: -30%;
    width: 44%;
    height: 60%;
    clip-path: polygon(20% 0, 100% 30%, 80% 100%, 0 100%);
    background: linear-gradient(0deg, rgb(240 100 20 / 0.06), transparent 80%);
    animation-duration: 34s;
  }

  .dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgb(190 205 255 / 0.16) 1px, transparent 1.4px);
    background-size: 26px 26px;
    mask: radial-gradient(900px 520px at 85% 0%, #000, transparent 75%);
  }

  /* The thin angular rule that frames the top of the Overwatch site. */
  .frame {
    position: absolute;
    inset: 0 0 auto;
    height: 96px;
    border-bottom: 1px solid rgb(160 185 255 / 0.16);
    background: linear-gradient(180deg, rgb(120 150 255 / 0.1), transparent);
    clip-path: polygon(0 0, 100% 0, 100% 100%, calc(100% - 300px) 100%, calc(100% - 330px) calc(100% - 14px), 330px calc(100% - 14px), 300px 100%, 0 100%);
  }

  @keyframes drift {
    to {
      translate: 3% 4%;
      rotate: 2deg;
    }
  }

  @keyframes breathe {
    50% {
      scale: 1.15;
      opacity: 0.75;
    }
  }
</style>
