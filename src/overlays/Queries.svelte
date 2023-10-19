<script>
  import Pin from '../components/Pin.svelte';
  import OurPin from '../components/OurPin.svelte';
  import HoverBubble from '../components/HoverBubble.svelte';

  export let forwardProjectionFunction;
  export let pins;
  export let ourPins = [];
  export let cursor;
  export let griddedName;
  export let griddedData;
  export let griddedUnit;
  export let griddedDomain;
  export let griddedScale;
  export let griddedColormap;

  export let kioskMode;

  console.log("ourpins", ourPins)
</script>

<div>
  {#if !kioskMode}
    {#if pins.length}
    {#each pins as pin (pin)}
      <Pin
        bind:pins
        {pin}
        {forwardProjectionFunction}
        {griddedName}
        {griddedData}
        {griddedUnit}
      />
    {/each}
    {/if}
    <!-- {#if ourPins.length} -->
    {#each ourPins as pin (pin)}
      <OurPin
        bind:pins={ourPins}
        {pin}
        {forwardProjectionFunction}
        {griddedName}
        {griddedData}
        {griddedUnit}
      />
    {/each}
    <!-- {/if} -->
  {/if}
  {#if cursor}
    <HoverBubble
      {forwardProjectionFunction}
      lonLat={[cursor.longitude, cursor.latitude]}
      {griddedName}
      {griddedData}
      {griddedDomain}
      {griddedUnit}
      {griddedScale}
      {griddedColormap}
    />
  {/if}
</div>

<style>
  div {
    pointer-events: none;
    overflow: hidden;
    z-index: 0; /* create separate stacking context for pins */
  }
</style>
