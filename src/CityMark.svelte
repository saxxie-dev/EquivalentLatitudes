<script>
  export let cityName;

  import { latToYr, longToXr } from './Coordinates';
  import  { cityToCoords } from './Cities';

</script>
<style> 
  .city {
		position: absolute;
		transform: translate(-4px, -4px);
    display: flex;
    flex-direction: row;
	}

  .point {
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background-color: #e56204;
    border: 2px solid #595959;
    cursor: default;
  }

  .label {
    font-size: 12px;
    padding: 3px;
    padding-top: 1px;
    border-radius: 8px;
    color: #b9b8b9;
  }

  .point:hover {
    box-shadow: 0px 0px 5px 4px #e56204;
  }
</style>

<div class="city" style={
  `top: ${latToYr(cityToCoords[cityName][0])*100}%;
  left: ${longToXr(cityToCoords[cityName][1])*100}%
`}>
  <div class="point"/>
  <div class="label">{cityName}</div>
</div>
