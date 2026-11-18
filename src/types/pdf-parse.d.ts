// pdf-parse's package entry runs debug code when imported outside CommonJS; import the lib file directly.
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdf from "pdf-parse";
  export default pdf;
}
