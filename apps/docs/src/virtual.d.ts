declare module "virtual:search-index" {
  import type { SearchEntry } from "./lib/search";
  const index: SearchEntry[];
  export default index;
}
