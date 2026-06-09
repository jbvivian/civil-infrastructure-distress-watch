/**
 * Future integration point for richer document summaries.
 *
 * The prototype intentionally does not call an external model. A later adapter can
 * check OPENAI_API_KEY here and return a source-cited summary while preserving the
 * deterministic extractor as the default and fallback path.
 */
export function isOpenAiSummarizationAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
