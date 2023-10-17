<script>
  import SearchBox from '../components/SearchBox.svelte';
  import LocationsList from '../components/LocationsList.svelte';

  import ChipGroup from '../components/ChipGroup.svelte';
  import Tweener from '../tweener.js';
  import { fetchJson } from '../utility.js';
  import { cubicOut } from 'svelte/easing';
  import Button from '../components/Button.svelte';
  import { slide, fade } from 'svelte/transition';
  import { currentDate } from '../stores.js';

  export let centerLongitude;
  export let centerLatitude;
  export let zoom;
  export let ourPins;
  export let griddedData;
  export let griddedUnit;
  export let griddedDataset;
  export let keplerTemp;

  // console.log(griddedDataset)

  let radars;
  let radarPins = [];
  let polygons = [];

  async function loadData() {
    if(!radars){
      const res = await fetch('http://localhost:5173/dev.json');
      radars = await res.json();
    }else{
      radars.features.map((item) => {
        if(item.geometry.type == 'Point'){
          radarPins.push({
            label: item.properties.city || item.properties.state || item.properties.address || 'no label',
            longitude: item.geometry.coordinates[0],
            latitude: item.geometry.coordinates[1]
          })
        }else if(item.geometry.type == 'Polygon'){
          polygons.push(item.geometry.coordinates[0])
        }
      })
      
      radarPins = radarPins.slice(0, 10)
      // console.log("radars", radarPins)
      radarPins.forEach((i) => {
        dropPin(i)
      })
    }
    // return radarPins;
    // return fetchJson('/tera/locations.json.br');
  }

  async function onSelect(city) {
    // await moveTo(city);
    dropPin(city);
  }

  let opts = {
    duration: 800,
    easing: cubicOut,
  }

  let lonTweener = new Tweener(c => centerLongitude = c, opts);
  let latTweener = new Tweener(c => centerLatitude = c, opts);
  let zoomTweener = new Tweener(z => zoom = z, opts);

  async function moveTo(city) {
    let zoomOutIn = zoom > 1.5;
    let originalZoom = zoom;

    if (zoomOutIn) await zoomTweener.tween(zoom, 1.5);

    // ensure the shorter way around is taken (across the anti-meridian)
    if (centerLongitude - city.longitude > 180) {
      centerLongitude -= 360;
    } else if (city.longitude - centerLongitude > 180) {
      centerLongitude += 360;
    }

    await Promise.all([
      lonTweener.tween(centerLongitude, city.longitude),
      latTweener.tween(centerLatitude, city.latitude),
    ]);

    if (zoomOutIn) await zoomTweener.tween(zoom, originalZoom);
  }

  function dropPin(city) {
    if (!ourPins.find(pin => pin === city)) {
      ourPins = [city, ...ourPins];
    }
  }

  let kepler;

  let controller = new AbortController();
  let { signal } = controller;

  const fetchKeplerTemp = async () => {
    let refDate = await fetchJson('http://localhost:5173/prd.json');
    let refObj = refDate.filter((item) => item.name == keplerTemp.model)
    keplerTemp.reference_time = refObj ? refObj[0].reference_time : $currentDate
    console.log(keplerTemp)
    // let res = await griddedDataset.fetchData($currentDate, signal, keplerTemp)
    // console.log(res)
  }
</script>

<Button action={loadData} full tip={radars ? '' : 'dev.json'}>
  {radars ? 'Draw Markers' : 'Fetch Assets'}
</Button>
<br />
{#if ourPins.length > 1}
  <div transition:slide>
  <Button secondary full transition action={() => ourPins = []}>
    Remove all markers
  </Button>
  </div>
{:else if ourPins.length === 0}
  <p transition:fade>There are currently no marked locations.</p>
{/if}

<hr />
<h3>Temperature</h3>
<ChipGroup
  options={['Wind', 'Temperature']}
  bind:selected={kepler}
  on:select={fetchKeplerTemp}
/>
