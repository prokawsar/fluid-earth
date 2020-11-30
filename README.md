# FEV2r (Fluid Earth Viewer 2)

A potential successor to [FEVer](https://fever.byrd.osu.edu), making use of of
[WebGL](https://en.wikipedia.org/wiki/WebGL).

## Prerequisites

- [git](https://git-scm.com/)
- [Node.js (version >= 13)](https://nodejs.org)
- [wgrib2](https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/)

## Getting started

Install the dependencies...

```bash
git clone <URL of this repo>
cd fev2r
npm install
```

...add the development data...

Download the [starter
packet](https://drive.google.com/file/d/1lgwKIJRu8Y8BKjF4ikIml6_oa8MV1K8p/view?usp=sharing),
unzip it, and move the `data` directory into the `public` directory:

```bash
unzip fev2r-development-data.zip -d public
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see your app
running. Edit a component file in `src`, save it, and the page should
automatically reload with your changes.

## Updating local development environment

Pull from upstream (i.e. the repository at
[https://code.osu.edu/zhan.153/fev2r.git](https://code.osu.edu/zhan.153/fev2r.git))...

```bash
git pull <URL or name of upstream remote> master
```

...then ensure any changes to dependencies are applied:

```bash
npm install
```

## Building and running in production mode

To create an optimised version of the app:

```bash
npm run build
```

You can run the newly built app with `npm run start`. This uses
[sirv](https://github.com/lukeed/sirv), which is included in your package.json's
`dependencies` so that the app will work when you deploy to platforms like
[Heroku](https://heroku.com).

## Terms of Use

[MIT License](LICENSE) +

The laws of the State of Ohio shall govern these Terms of Use and any disputes
relating to our site.

IF YOU DO NOT AGREE TO AND ACCEPT THESE TERMS OF USE YOU SHOULD NOT USE THE
SOFTWARE.
