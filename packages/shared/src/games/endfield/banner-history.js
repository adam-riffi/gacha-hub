// Runtime shim, as catalog.js: bundlers load the JSON; TypeScript only sees banner-history.d.ts.
import data from "./banner-history.json";
export default data;
