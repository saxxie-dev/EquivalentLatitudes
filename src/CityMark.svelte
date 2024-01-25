<script>
  export let cityName;

  import { latToYr, longToXr } from './Coordinates';
  import  { cityToCoords } from './Cities';

</script>
<style> 
  .city {
		position: absolute;
		transform: translate(-4px, -4px);
		pointer-events: none;
    display: flex;
    flex-direction: row;
	}
  .point {
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background-color: #e56204;
    border: 2px solid #595959;
  }
  .label {
    /*background-color: rgba(229,98,4, 0.7);*/
    font-size: 12px;
    padding: 3px;
    padding-top: 1px;
    border-radius: 8px;
    color: #b9b8b9;
  }
</style>

<div class="city" style={
  `top: ${latToYr(cityToCoords[cityName][0])*100}%;
  left: ${longToXr(cityToCoords[cityName][1])*100}%
`}>
  <div class="point"/>
  <div class="label">{cityName}</div>
</div>
