<!--
  A one-colour image (a role's icon) drawn in the colour of the text around
  it, whatever colour the image file itself is: the image is used as a
  stencil over a block of the text colour. So the same file shows on the
  dark panels and on a dropdown's light highlighted option.

  `src` is the image's address (lib/assets.js), `size` its height and width
  in pixels. With a `label` it is read out and shown as a tooltip; without
  one it is decoration beside text that already says what it is.
-->
<script>
  let { src, size = 14, label = undefined } = $props();
</script>

<span
  class="glyph"
  style:--image={`url("${src}")`}
  style:--size="{size}px"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  title={label}
></span>

<style>
  .glyph {
    flex: none;
    display: inline-block;
    width: var(--size);
    height: var(--size);
    background: currentColor;
    -webkit-mask: var(--image) center / contain no-repeat;
    mask: var(--image) center / contain no-repeat;
    vertical-align: -0.15em;
  }
</style>
