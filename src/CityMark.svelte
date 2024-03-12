<script>
  import { latToYr, longToXr } from './Coordinates';
  import { cityToCoords } from './Cities';
  import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
  export let cityName;
  export let selectedCity;
  const onSelect = () => {
    dispatch("select", { latitude: cityToCoords[cityName][0], name: cityName });
  }
</script>
<style> 
  .city {
		position: absolute;
		transform: translate(-3px, -7px);
    display: flex;
    flex-direction: row;
    z-index: 2;
    align-items: center;
	}

  .point {
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background-color: #e56204;
    border: 2px solid #595959;
    cursor: pointer;
  }

  :global(.dragging) .point {
    cursor: unset;
  }

  :global(.dragging) .city:not(.selected) .point {
    box-shadow: none;
  }

  .label {
    font-size: 12px;
    padding: 3px;
    padding-top: 1px;
    border-radius: 8px;
    color: #b9b8b9;
    text-decoration: none;
    transition: padding-left 0.2s, color 0.3s;
    pointer-events: none;
  }

  .point:hover {
    box-shadow: 0px 0px 5px 4px #e56204;
  }

  .selected .label {
    text-shadow: #e56204 0px 0px 5px;
    text-decoration: underline;
    padding-left: 5px;
    font-weight: bold;
    cursor: pointer;
    pointer-events: all;
    color: #ddd;
  }

  .selected .point {
    box-shadow: 0px 0px 5px 4px #e56204;
  }

  .selected .label::after {
    content: " »";
  }
</style>

<div 
  class={`city${selectedCity === cityName ? " selected" : ""}`} 
  style={`
    top: ${latToYr(cityToCoords[cityName][0])*100}%;
    left: ${longToXr(cityToCoords[cityName][1])*100}%;`}>
    <div class="point" 
      on:click={(e) => {
        if (selectedCity === cityName){
          window.open(`https://wikipedia.org/wiki/${cityName}`);
        } else {
          onSelect();
        }
        e.stopPropagation();
        }}/>
    <a class="label" href={`https://wikipedia.org/wiki/${cityName}`}>{cityName}</a>
</div>
