import "./app.css";
import App from "./App.svelte";
import { GriddedDataset, ParticleDataset } from "./datasets.js";
import { fetchPreloadedJson } from "./utility.js";

(async () => {
  let inventory = await fetchPreloadedJson("/tera/inventory.json.br");
  console.log("inventory:", inventory);
  inventory.push({
    name: "radar",
    path: "/tera/radar/",
    start: "2021-03-22T12:00:00.000Z",
    end: "2023-10-16T06:00:00.000Z",
    unit: "km/h",
    originalUnit: "m/s",
    domain: [0, 100],
    colormap: "TURBO",
    width: 1440,
    height: 721,
    interval: "hourly",
    projection: "GFS",
  });
  let gDatasets = [...GriddedDataset.filter(inventory), GriddedDataset.none];
  let pDatasets = [...ParticleDataset.filter(inventory), ParticleDataset.none];

  new App({ target: document.body, props: { gDatasets, pDatasets } });
})();
