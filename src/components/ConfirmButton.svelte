<!--
  A button for destructive actions: the first click arms it ("Sure?"), the
  second within a few seconds runs `onconfirm`. Moving on disarms it.
-->
<script>
  const ARMED_FOR_MS = 3500;

  let { label = 'Delete', confirmLabel = 'Sure?', onconfirm, disabled = false, class: className = 'btn small danger' } = $props();

  let armed = $state(false);
  let timer;

  function click() {
    clearTimeout(timer);
    if (armed) {
      armed = false;
      onconfirm();
    } else {
      armed = true;
      timer = setTimeout(() => (armed = false), ARMED_FOR_MS);
    }
  }
</script>

<button type="button" class={className} class:armed {disabled} onclick={click} onblur={() => (armed = false)}>
  {armed ? confirmLabel : label}
</button>

<style>
  .armed {
    border-color: #e5484d;
    background: #e5484d;
    color: #fff;
    animation: nudge 300ms var(--ease-back);
  }

  @keyframes nudge {
    50% {
      scale: 1.08;
    }
  }
</style>
