<script>
  import SearchBox from '../components/SearchBox.svelte';
  import LocationsList from '../components/LocationsList.svelte';
  import Tweener from '../tweener.js';
  import { fetchJson } from '../utility.js';
  import { cubicOut } from 'svelte/easing';

  export let centerLongitude;
  export let centerLatitude;
  export let zoom;
  export let ourPins;
  export let griddedData;
  export let griddedUnit;

  let label = 'Add pin by country, city, or state:';
  let placeholder = 'Columbus, Ohio, United States';

  let radars;
  let radarPins = [];
  let polygons = [];
  
  async function loadData() {
    const res = await fetch('http://localhost:5173/prd.json');
    radars = await res.json();

    radars.features.map((item) => {
      if(item.geometry.type == 'Point'){
        radarPins.push({
          label: item.properties.city || item.properties.state || item.properties.address || 'no label',
          longitude: item.geometry.coordinates[0],
          latitude: item.geometry.coordinates[1]
        })
      }
    })
    console.log("radars", radarPins)
    return radarPins;
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
</script>

<details open>
<summary><h2>About This Menu</h2></summary>
<p>
This our custom markers
</p>
</details>

<details open>
<summary><h2>Marked locations</h2></summary>
<SearchBox {label} {placeholder} {loadData} {onSelect} />
<LocationsList
  bind:pins={ourPins}
  {griddedData}
  {griddedUnit}
  {moveTo}
/>
</details>
