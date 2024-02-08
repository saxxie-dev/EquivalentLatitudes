<script>
	let focusX=10;
	let focusY=0;
	let h=90;
	let mapDiv;



	import Pane from "./Pane.svelte";
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

	.coordShow {
		position: absolute;
		bottom: 0px;
		right: 0px;
		color: white;
	}
</style>

<Pane/>