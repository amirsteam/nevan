
/**
 * Ask for fresh search/link-preview page copies (services/seoPagesService)
 * after a change. No-op without WEB_ROOT (development, tests).
 */
export const requestSeoRefresh = (): void => {
  if (!process.env.WEB_ROOT) return;
  // Loaded lazily: the service imports the models that call this
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../services/seoPagesService").scheduleSeoRefresh();
};

/** Refresh the page copies after any write to this model (debounced by the service) */
// Any schema (generic: Mongoose's schema types don't widen to Schema<any>)
export const refreshSeoOnWrite = <S extends { post: (...args: any[]) => unknown }>(schema: S): void => {
  schema.post("save", requestSeoRefresh);
  schema.post(["findOneAndUpdate", "updateOne", "updateMany", "findOneAndDelete", "deleteMany"], requestSeoRefresh);
  schema.post("deleteOne", { document: true, query: true }, requestSeoRefresh);
};
