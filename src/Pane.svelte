<script>
  import { spring } from 'svelte/motion';
  import { yrToLat, latToYr, xrToLong, longToXr } from "./Coordinates";
	import { cityToCoords } from "./Cities"
	import CityMark from "./CityMark.svelte";

  let screenH, screenW;
  let zoom = 1;
  let dragStart = undefined;
  let offset = spring({x: 0, y: 0}, 
    { stiffness: 0.2, damping: 0.4});
  
  let mapRatio;

  const onDragStop = () => { 
    dragStart = undefined; 
    offset.set(normalizePosition({x: $offset.x, y: $offset.y}, zoom));
  };


  const mapHeight = (zoom) => 500 * zoom;
  
  const normalizeDimension = (mapD, screenD, margin, i) => {
    const margin0 = Math.max(margin, i);
    const margin1 = Math.max(margin, screenD - mapD - i);
    if(margin0 > margin || margin1 > margin) {
      if (mapD > screenD) {
        if(margin0 > margin) {
          return margin;
        } else {
          return screenD - mapD - margin;
        }
      } else {
        return (screenD - mapD) / 2;
      }
    }
    return i;
  };

  const normalizePosition = ({x , y}, zoom) => {
    const mapH = mapHeight(zoom);
    const mapW = mapH * mapRatio;

    const allowedMarginX = 0.1 * screenW;
    const allowedMarginY = 0.05 * screenH;

    return {
      x: normalizeDimension(mapW, screenW, allowedMarginX, x * screenW) / screenW,
      y: normalizeDimension(mapH, screenH, allowedMarginY, y * screenH) / screenH,
    };
  };

  

</script>
<style>
  div {
    position: absolute;
    top: 0px;
    left: 0px;
    bottom: 0px;
    right: 0px;
    color: white;
    overflow: hidden;
    user-select: none;
    cursor: grab;
  }
</style>
<svelte:window bind:innerHeight={screenH} bind:innerWidth={screenW}/>
<div
  on:mousedown={(e) => { dragStart = {x: e.screenX, y: e.screenY, ox: $offset.x, oy: $offset.y}; }}
  on:mouseup={onDragStop}
  on:mouseleave={onDragStop}
  on:mousemove={(e) => { 
    if(dragStart) {      
      offset.set({
        x: dragStart.ox - (dragStart.x - e.screenX)/(screenW),
        y: dragStart.oy - (dragStart.y - e.screenY)/(screenH),
      });
    }
  }}
  on:wheel={(e) => {
    const multiplier = Math.exp(e.wheelDeltaY / 500);
    zoom *= multiplier;
    offset.set(
      normalizePosition({
      x: e.clientX / screenW * (1 - multiplier)  + multiplier * $offset.x,
      y: e.clientY / screenH * (1 - multiplier) + multiplier * $offset.y,
    }, zoom), {hard: true});
  }}>
  <div 
    style={`
      transform: translate(${$offset.x * screenW}px, ${$offset.y * screenH}px);
      height:${mapHeight(zoom)}px;
      width: max-content;
      overflow: visible;
    `} >
      <img 
        on:load={(e) => { mapRatio = e.target.width / e.target.height; } }
        draggable="false"
        style="height: 100%;"
        src="https://saxxie.dev/EquivalentLatitudes/north-america-equirectangular.svg"/>
      {#each Object.keys(cityToCoords) as cityName}
		    <CityMark cityName={cityName} />
	    {/each}
  </div>
</div>