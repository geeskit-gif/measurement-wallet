export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return env.ASSETS.fetch(request);
  },
};

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
