import * as twgl from "twgl.js";
import * as topojson from "topojson-client";

import griddedVert from "./gridded.vert";
import griddedFrag from "./gridded.frag";
import vectorVert from "./vector.vert";
import vectorFrag from "./vector.frag";
import colormapFrag from "./colormap.frag";

import { glDraw, griddedArrays } from "./webgl.js";

export default class MapBackground {
  constructor(gl, options) {
    // private variables with corresponding public setters
    this._data = options.data;
    this._colormap = options.colormap;
    this._domain = options.domain;
    this._scale = options.scale;
    this._baseColor = options.baseColor;
    this._custom = options.customVector;

    // private variables (no setters)
    this._gl = gl;
    this._gl.enable(gl.BLEND);
    this._gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this._dataTextureDimensions = getDataTextureDimensions(
      this._data,
      this._maxTextureSize
    );
    this._programs = this._createPrograms();
    this._buffers = this._createBuffers(options.vectorData);
    this._textures = this._createTextures();
    this._framebuffers = this._createFramebuffers();

    this._mapDataToColors();
    this._dataNeedsRecolor = false;
  }

  set data(d) {
    this._data = d;

    this._textures.gridded.forEach((t) => this._gl.deleteTexture(t));
    this._textures.data.forEach((t) => this._gl.deleteTexture(t));
    this._gl.deleteFramebuffer(this._framebuffers.gridded.framebuffer);

    this._dataTextureDimensions = getDataTextureDimensions(
      this._data,
      this._maxTextureSize
    );

    this._textures.gridded = this._createGriddedTextures();
    this._textures.data = this._createDataTextures();
    this._framebuffers = this._createFramebuffers();
    this._dataNeedsRecolor = true;
  }

  set colormap(c) {
    this._colormap = c;
    this._gl.deleteTexture(this._textures.colormap);
    this._textures.colormap = this._createColormapTexture();
    this._dataNeedsRecolor = true;
  }

  set domain(d) {
    this._domain = d;
    this._dataNeedsRecolor = true;
  }

  set scale(s) {
    this._scale = s;
    this._dataNeedsRecolor = true;
  }

  set baseColor(b) {
    this._baseColor = b;
    this._dataNeedsRecolor = true;
  }

  set vectorData(d) {
    Object.values(this._buffers.vectors).forEach((vector) => {
      this._gl.deleteBuffer(vector.indices);
    });
    this._buffers.vectors = this._createVectorBuffers(d);
  }

  drawGriddedData(sharedUniforms) {
    if (this._dataNeedsRecolor) {
      this._mapDataToColors();
      this._dataNeedsRecolor = false;
    }
    for (let i = 0; i < this._textures.gridded.length / 16; i++) {
      let textures = Object.fromEntries(
        this._textures.gridded
          .slice(i * 16, i * 16 + 16)
          .map((t, j) => [`u_texture${j}`, t])
      );
      glDraw(this._gl, this._programs.gridded, this._buffers.gridded, {
        ...textures,
        u_gridWidth: this._data.width,
        u_gridHeight: this._data.height,
        u_maxTextureSize: this._maxTextureSize,
        u_textureBatchNumber: i,
        ...sharedUniforms,
      });
    }
  }

  drawVectorData(sharedUniforms, colors) {
    for (const [name, color] of Object.entries(colors)) {
      let bufferInfo = this._buffers.vectors[name];
      if (bufferInfo !== undefined) {
        glDraw(
          this._gl,
          this._programs.vector,
          bufferInfo,
          {
            u_color: color.map((v, i) => (i === 3 ? v : v / 255)),
            ...sharedUniforms,
          },
          this._gl.LINES
        );
      }
    }
  }

  _createPrograms() {
    return {
      gridded: twgl.createProgramInfo(this._gl, [griddedVert, griddedFrag]),
      vector: twgl.createProgramInfo(this._gl, [vectorVert, vectorFrag]),
      colormap: twgl.createProgramInfo(this._gl, [griddedVert, colormapFrag]),
    };
  }

  _createBuffers(vectorData) {
    let gridded = twgl.createBufferInfoFromArrays(this._gl, griddedArrays);
    return {
      gridded: gridded,
      vectors: this._createVectorBuffers(vectorData),
      colormap: gridded,
    };
  }

  _createVectorBuffers(data) {
    let buffers = {};
    for (const [name, obj] of Object.entries(data.objects)) {
      // if (name == "ne_50m_lakes") {
      // console.log("topo data:", obj);
      buffers[name] = createBufferInfoFromTopojson(
        this._gl,
        data,
        obj,
        this._custom
      );
      // }
    }
    return buffers;
  }

  _createTextures() {
    return {
      gridded: this._createGriddedTextures(),
      data: this._createDataTextures(),
      colormap: this._createColormapTexture(),
    };
  }

  _createGriddedTextures() {
    let options = {
      mag: this._gl.NEAREST, // show zoomed in data as individual pixels
      min: this._gl.LINEAR,
      auto: false,
    };

    return this._dataTextureDimensions.map(({ width, height }) => {
      return twgl.createTexture(this._gl, { width, height, ...options });
    });
  }

  _createDataTextures() {
    let { floatArray } = this._data;
    let halfFloat = floatArray.constructor.name !== "Float32Array";
    let options = {
      type: halfFloat ? this._gl.HALF_FLOAT : this._gl.FLOAT,
      internalFormat: halfFloat ? this._gl.R16F : this._gl.R32F,
      format: this._gl.RED,
      minMag: this._gl.NEAREST, // don't filter between data points
    };

    let offset = 0;
    floatArray = halfFloat ? new Uint16Array(floatArray.buffer) : floatArray;

    return this._dataTextureDimensions.map(({ width, height }) => {
      let start = offset;
      let end = start + width * height;
      offset = end;

      let src;
      if (end <= floatArray.length) {
        src = floatArray.subarray(start, end);
      } else {
        src = new (halfFloat ? Uint16Array : Float32Array)(end - start);
        src.set(floatArray.subarray(start, end));
      }

      return twgl.createTexture(this._gl, { src, width, height, ...options });
    });
  }

  _createColormapTexture() {
    return twgl.createTexture(this._gl, {
      src: this._colormap.lut.flat(),
      format: this._gl.RGB,
      minMag: this._gl.LINEAR,
      width: this._colormap.lut.length,
      height: 1,
    });
  }

  _createFramebuffers() {
    return {
      gridded: this._dataTextureDimensions.map(({ width, height }, i) => {
        return twgl.createFramebufferInfo(
          this._gl,
          [{ attachment: this._textures.gridded[i] }],
          width,
          height
        );
      }),
    };
  }

  // draw a texture that represents the (gridded) data using the selected
  // colormap, domain, and scale type
  _mapDataToColors() {
    for (let i = 0; i < this._textures.data.length; i++) {
      // switch rendering destination to our framebuffer
      twgl.bindFramebufferInfo(this._gl, this._framebuffers.gridded[i]);

      glDraw(this._gl, this._programs.colormap, this._buffers.colormap, {
        u_data: this._textures.data[i],
        u_colormap: this._textures.colormap,
        u_colormapN: this._colormap.lut.length,
        u_domain: this._domain,
        u_scale: this._scale === "log" ? 1 : 0,
        u_baseColor: this._baseColor.map((v, i) => (i === 3 ? v : v / 255)),
      });
    }

    // switch rendering destination back to canvas
    twgl.bindFramebufferInfo(this._gl, null);
  }
}

function getDataTextureDimensions(data, max) {
  if (data.width <= max && data.height <= max) {
    return [{ width: data.width, height: data.height }];
  }

  let pixelCount = data.width * data.height;
  let maxPixelsPerTexture = Math.pow(max, 2);
  let length = Math.floor(pixelCount / maxPixelsPerTexture);

  let lastHeight = Math.ceil((pixelCount % maxPixelsPerTexture) / max) + 1;

  return [
    ...Array(length).fill({ width: max, height: max }),
    { width: max, height: lastHeight },
  ];
}

function createBufferInfoFromTopojson(gl, data, object, custom) {
  let mesh = topojson.mesh(data, object);
  let points = [];
  // console.log("custom", custom);
  // let myPoints = [
  //   [
  //     [19.673941, 41.055131],
  //     [19.674481, 41.042149],
  //     [19.682588, 41.029399],
  //     [19.694478, 41.018039],
  //     [19.73258, 41.007607],
  //     [19.75636, 41.012707],
  //     [19.76852, 41.022212],
  //     [19.7923, 41.007839],
  //     [19.813378, 41.001812],
  //     [19.817161, 40.980252],
  //     [19.80419, 40.970979],
  //     [19.807973, 40.942928],
  //     [19.802298, 40.914414],
  //     [19.803379, 40.905605],
  //     [19.823916, 40.876859],
  //     [19.859046, 40.873845],
  //     [19.869855, 40.868513],
  //     [19.878773, 40.851822],
  //     [19.864451, 40.852285],
  //     [19.852561, 40.848808],
  //     [19.842292, 40.852285],
  //     [19.825808, 40.850199],
  //     [19.823916, 40.859704],
  //     [19.811486, 40.859704],
  //     [19.808514, 40.850894],
  //     [19.781491, 40.851822],
  //     [19.773654, 40.849735],
  //     [19.766358, 40.838376],
  //     [19.763926, 40.811252],
  //     [19.754468, 40.818671],
  //     [19.740146, 40.820062],
  //     [19.73231, 40.811948],
  //     [19.730688, 40.797343],
  //     [19.738525, 40.778101],
  //     [19.766358, 40.759092],
  //     [19.767169, 40.747501],
  //     [19.754468, 40.7373],
  //     [19.762035, 40.726637],
  //     [19.754738, 40.712263],
  //     [19.76906, 40.70415],
  //     [19.79257, 40.703686],
  //     [19.799056, 40.700904],
  //     [19.80446, 40.687922],
  //     [19.800137, 40.677258],
  //     [19.810135, 40.670999],
  //     [19.808243, 40.662421],
  //     [19.835806, 40.64828],
  //     [19.840671, 40.635993],
  //     [19.810405, 40.623707],
  //     [19.825538, 40.613043],
  //     [19.833104, 40.601452],
  //     [19.837698, 40.571778],
  //     [19.862289, 40.553232],
  //     [19.880124, 40.548827],
  //     [19.900661, 40.547437],
  //     [19.907687, 40.538395],
  //     [19.905525, 40.5275],
  //     [19.886879, 40.525645],
  //     [19.87526, 40.517995],
  //     [19.870125, 40.500608],
  //     [19.846075, 40.487394],
  //     [19.838239, 40.478353],
  //     [19.829051, 40.479048],
  //     [19.817431, 40.464212],
  //     [19.812567, 40.448911],
  //     [19.798785, 40.431988],
  //     [19.794462, 40.419238],
  //     [19.778789, 40.423874],
  //     [19.76906, 40.428743],
  //     [19.759873, 40.424106],
  //     [19.742848, 40.42712],
  //     [19.737714, 40.436161],
  //     [19.74501, 40.456793],
  //     [19.737984, 40.465834],
  //     [19.742038, 40.475803],
  //     [19.741768, 40.490408],
  //     [19.720149, 40.492726],
  //     [19.726094, 40.517995],
  //     [19.713124, 40.527732],
  //     [19.694478, 40.53005],
  //     [19.679615, 40.538164],
  //     [19.670157, 40.535614],
  //     [19.655295, 40.544423],
  //     [19.640973, 40.546973],
  //     [19.630704, 40.554391],
  //     [19.602871, 40.555782],
  //     [19.58963, 40.563664],
  //     [19.579632, 40.558796],
  //     [19.575038, 40.578733],
  //     [19.563418, 40.585224],
  //     [19.552879, 40.57711],
  //     [19.540178, 40.582906],
  //     [19.540989, 40.594729],
  //     [19.516939, 40.601452],
  //     [19.515047, 40.606552],
  //     [19.478567, 40.612115],
  //     [19.479648, 40.620461],
  //     [19.47046, 40.632052],
  //     [19.456949, 40.637848],
  //     [19.457219, 40.649439],
  //     [19.451544, 40.652916],
  //     [19.42236, 40.640166],
  //     [19.412631, 40.63808],
  //     [19.39858, 40.648744],
  //     [19.349398, 40.664508],
  //     [19.3394, 40.664508],
  //     [19.328321, 40.655467],
  //     [19.307783, 40.655467],
  //     [19.316431, 40.665435],
  //     [19.338319, 40.678649],
  //     [19.356694, 40.699745],
  //     [19.369125, 40.725014],
  //     [19.369665, 40.75631],
  //     [19.367774, 40.760946],
  //     [19.376691, 40.796184],
  //     [19.376421, 40.811716],
  //     [19.370206, 40.822148],
  //     [19.389122, 40.837912],
  //     [19.39858, 40.86179],
  //     [19.400471, 40.881727],
  //     [19.408038, 40.907923],
  //     [19.416685, 40.923687],
  //     [19.457759, 40.948492],
  //     [19.474784, 40.964952],
  //     [19.475594, 40.983266],
  //     [19.465055, 40.997175],
  //     [19.439654, 40.997175],
  //     [19.439114, 41.007375],
  //     [19.455057, 41.010389],
  //     [19.449652, 41.018271],
  //     [19.464245, 41.032181],
  //     [19.478296, 41.033803],
  //     [19.471, 41.044004],
  //     [19.483701, 41.050263],
  //     [19.49478, 41.034267],
  //     [19.503698, 41.032876],
  //     [19.517209, 41.051654],
  //     [19.555041, 41.045626],
  //     [19.558013, 41.056986],
  //     [19.576119, 41.064868],
  //     [19.599899, 41.071823],
  //     [19.611248, 41.062781],
  //     [19.619085, 41.063245],
  //     [19.643405, 41.056754],
  //     [19.670698, 41.071359],
  //     [19.673941, 41.055131],
  //   ],
  // ];

  for (const line of custom.geometries) {
    for (let i = 0; i < line.length - 1; i++) {
      points.push(...line[i], 0, ...line[i + 1], 1);
    }
  }

  return twgl.createBufferInfoFromArrays(gl, {
    a_lonLat: { numComponents: 3, data: points },
  });
}
