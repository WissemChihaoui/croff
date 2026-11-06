export {
  DEFAULT_CLASS_FUNCTIONS,
  extractCandidates,
  type Candidate,
  type CandidateContext,
  type DynamicExpression,
  type ExtractOptions,
  type ExtractResult,
} from "./extract.js";
export {
  DEFAULT_CONTENT,
  DEFAULT_IGNORE,
  Scanner,
  type ScannedCandidate,
  type ScannedExpression,
  type ScannerOptions,
  type ScanResult,
} from "./scan.js";
export { watchFiles, type WatchHandle, type WatchOptions } from "./watch.js";
