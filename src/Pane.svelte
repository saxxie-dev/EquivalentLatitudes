<script>
  import { spring } from 'svelte/motion';
  import { yrToLat, latToYr, xrToLong, longToXr } from "./Coordinates";
	import { cityToCoords } from "./Cities"
	import CityMark from "./CityMark.svelte";

  let screenH, screenW;
  let zoom = 1;
  let dragStart = undefined;
  let dragMoved = true;

  let offset = spring({x: 0, y: 0}, 
    { stiffness: 0.2, damping: 0.4});
  
  let mapRatio;
  let initialTouchDistance;

  let referenceLatitude = undefined;
  let referenceCity = undefined;

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

  const normalizeCurrentPosition = () => {
    offset.set(normalizePosition({x: $offset.x, y: $offset.y}, zoom));
  }

  const deselect = () => {
    referenceLatitude = undefined;
    referenceCity = undefined;
  };

  const onDragStop = () => { 
    dragStart = undefined; 
    initialTouchDistance = undefined;
    dragMoved = false;
    normalizeCurrentPosition();
  };

  const onCurseStop = () => {
    if(!dragMoved) {
      deselect();
    }
    onDragStop();
  };

</script>
<style>
  .pane {
    position: absolute;
    inset: 0;
    overflow: hidden;
    user-select: none;
    cursor: default;
  }

  .pane:global(.dragging) {
    cursor: move;
  }

  .mapContainer {
    width: max-content;
    overflow: visible;
  }

  .arctic {
    position: absolute;
    left: -500%;
    width: 1000%;
    height: 300%;
    transform: translateY(-100%);
    border-bottom: 1px solid #696969;
    opacity: 0.3;
    mix-blend-mode: plus-lighter;
  }

  .tropic {
    position: absolute;
    left: -500%;
    width: 1000%;
    height: 300%;
    border-top: 1px solid #696969;
    opacity: 0.3;
    mix-blend-mode: multiply;
  }

  .zoneLabel {
    position: absolute;
    color: #aaa;
    text-shadow: #595959 0px 0px 3px;
    font-size: 11px;
  }

  .reference {
    position: absolute;
    width: 1000%;
    left: -500%;
    height: 0px;
    background-color: #e56204;
    box-shadow: 0px 0px 3px 0.5px #e56204;
    z-index: 1; /*Otherwise causes blurring on mobile, inexpliciably*/
  }
</style>
<svelte:window bind:innerHeight={screenH} bind:innerWidth={screenW}/>
<div
  class={`pane${dragStart === undefined ? "" : " dragging"}`}
  on:mousedown={(e) => {
    dragStart = {
      x: e.screenX,
      y: e.screenY,
      ox: $offset.x,
      oy: $offset.y,
    };
  }}
  on:mouseup={onCurseStop}
  on:mouseleave={onDragStop}
  on:mousemove={(e) => { 
    if(dragStart) {
      dragMoved = true;      
      offset.set({
        x: dragStart.ox - (dragStart.x - e.screenX)/(screenW),
        y: dragStart.oy - (dragStart.y - e.screenY)/(screenH),
      });
    }
  }}
  on:wheel|passive={(e) => {
    const multiplier = Math.exp(e.wheelDeltaY / 500);
    zoom *= multiplier;
    offset.set(
      normalizePosition({
      x: e.screenX / screenW * (1 - multiplier)  + multiplier * $offset.x,
      y: e.screenY / screenH * (1 - multiplier) + multiplier * $offset.y,
    }, zoom), {hard: true});
  }}
  on:touchstart={(e) => {
    const t0 = e.touches[0];
    const t1 = e.touches[1] ?? e.touches[0];

    if (e.touches.length >= 2) {
      const dx = t0.screenX - t1.screenX;
      const dy = t0.screenY - t1.screenY;
      initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  
    const tx = (t0.screenX + t1.screenX) / 2;
    const ty = (t0.screenY + t1.screenY) / 2;
    dragStart = {
      x: tx,
      y: ty,
      ox: $offset.x,
      oy: $offset.y,
    };
  }}
  on:touchmove={(e) => {
    const t0 = e.touches[0];
    const t1 = e.touches[1] ?? e.touches[0];
    const tx = (t0.screenX + t1.screenX) / 2;
    const ty = (t0.screenY + t1.screenY) / 2;
    dragMoved = true;
    if(e.touches.length >= 2 && initialTouchDistance) {
      const dx = t0.screenX - t1.screenX;
      const dy = t0.screenY - t1.screenY;
      const currentTouchDistance = Math.sqrt(dx * dx + dy * dy);
      const zoomRatio = currentTouchDistance / initialTouchDistance;
      zoom *= zoomRatio;
      initialTouchDistance = currentTouchDistance;

      // Update offset to keep the zoom centered
      const centerX = tx / screenW;
      const centerY = ty / screenH;
      offset.set(
        normalizePosition(
          {
            x: centerX * (1 - zoomRatio) + zoomRatio * $offset.x,
            y: centerY * (1 - zoomRatio) + zoomRatio * $offset.y,
          },
          zoom
        ),
        { hard: true }
      );
    } else {
      offset.set({
        x: dragStart.ox - (dragStart.x - tx)/(screenW),
        y: dragStart.oy - (dragStart.y - ty)/(screenH),
      });
    }
  }}
  on:touchend={onCurseStop}
  >
  <div 
    class="mapContainer"
    style={`
      transform: translate(${$offset.x * screenW}px, ${$offset.y * screenH}px);
      height:${mapHeight(zoom)}px;
    `}>
      <img 
        on:load={(e) => {
          mapRatio = e.target.width / e.target.height;
          onDragStop();
        } }
        draggable="false"
        style="height: 100%;"
        src="/north-america-equirectangular.svg"/>
      <div class="reference" style={`
        top: ${latToYr(referenceLatitude) * 100}%;
        display: ${referenceLatitude === undefined ? "none" : "block"};`}/>
      <div
        class="arctic"
        style={`
          top: ${latToYr(66.5)*100}%;
          background:  repeating-linear-gradient(
            -45deg,
            transparent,
            transparent ${5 * Math.sqrt(zoom)}px,
            #595959 ${5 * Math.sqrt(zoom)}px,
            #595959 ${8 * Math.sqrt(zoom)}px
          );`}
      />
      <span 
        class="zoneLabel"
          style={`left: ${-$offset.x * screenW + 6}px;
        top: ${latToYr(66.5)*100}%;`}>
          Arctic
      </span>
      <div
        class="tropic"
        style={`
          top: ${latToYr(23.5)*100}%;
          background:  repeating-linear-gradient(
            45deg,
            transparent,
            transparent ${5 * Math.sqrt(zoom)}px,
            #595959 ${5 * Math.sqrt(zoom)}px,
            #595959 ${8 * Math.sqrt(zoom)}px
          );`}
      />
      <span 
        class="zoneLabel"
        style={`left: ${-$offset.x * screenW + 6}px;
          top: ${latToYr(23.5)*100}%;
          transform: translateY(-100%);`}>
            Tropic
      </span>
      {#each Object.keys(cityToCoords) as cityName}
		    <CityMark 
          cityName={cityName}
          selected={referenceCity === cityName}
          dragging={dragMoved}
          on:select={(e) => {
            referenceLatitude = e.detail.latitude;
            referenceCity = e.detail.name;
          }}/>
	    {/each}
  </div>
</div>
