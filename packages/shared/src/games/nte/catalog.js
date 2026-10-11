// Runtime shim: bundlers (Vite / esbuild / tsx) load the JSON; TypeScript only
// sees catalog.d.ts, so the multi-MB catalog is never type-inferred.
import data from "./catalog.json";
export default data;
