// Catalog JSON files are large (MBs). Letting TypeScript infer their literal
// types is slow and can exhaust the compiler's heap, so JSON imports are typed
// as `unknown` here (resolveJsonModule is off) and validated with zod at runtime.
declare module "*.json" {
  const value: unknown;
  export default value;
}
