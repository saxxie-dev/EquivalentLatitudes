<script>
	let focusX=10;
	let focusY=0;
	let h=90;
	let mapDiv;


	import { yrToLat, latToYr, xrToLong, longToXr } from "./Coordinates";
	import { cityToCoords } from "./Cities"
	import CityMark from "./CityMark.svelte";
</script>
<style>
	.map {
		margin: 0px;
		position:relative;
		display: flex;
		flex-direction: row;
		background-color: #10110e;
		overflow: hidden;
		cursor: none;
	}

	.crosshairX {
		position: absolute;
		width: 100%;
		height: 0px;
		border: 1px solid #e56204;
		opacity: 0.3;
		box-shadow: 0px 0px 3px 0px #e56204;
		pointer-events: none;
	}

	.crosshairY {
		position: absolute;
		height: 100%;
		top: 0px;
		width: 0px;
		border: 1px solid #e56204;
		opacity: 0.3;
		box-shadow: 0px 0px 3px 0px #e56204;
		pointer-events: none;
	}

	.crosshairCenter {
		border: 0px solid #40A080;
		position: absolute;
		background-color: #808080;
		height: 9px;
		width: 9px;
		border-radius: 50%;
		pointer-events: none;
		transform: translate(-5.5px, -5.5px);
	}

	img {
		flex-grow: 1;
	}
	


	.coordShow {
		position: absolute;
		bottom: 0px;
		right: 0px;
		color: white;
	}
</style>

<div bind:this={mapDiv} class="map" role="none" on:mousemove={(e) => {
	const mapRect=e.target.getBoundingClientRect();
	focusX=(e.clientX-mapRect.x) 
	focusY=(e.clientY-mapRect.y) }}>
	<img src="https://saxxie.dev/EquivalentLatitudes/north-america-equirectangular.svg"/>

	<div class="crosshairX" style={`top: ${focusY}px`}/>
	<div class="crosshairY" style={`left: ${focusX}px`}/>
	{#each Object.keys(cityToCoords) as cityName}
		<CityMark cityName={cityName}/>
	{/each}
	<!-- <div class="crosshairCenter" style={`top: ${focusY}px; left: ${focusX}px`}/> -->
	<div class="coordShow">
		{yrToLat(focusY / mapDiv?.getBoundingClientRect().height)}°N, {360+xrToLong(focusX/mapDiv?.getBoundingClientRect().width)}°W
	</div>
</div>
