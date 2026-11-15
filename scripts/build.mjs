import {build} from 'esbuild';
await build({entryPoints:['src/app.mjs'],bundle:true,outfile:'dist/app.js',format:'esm',target:'chrome140'});
