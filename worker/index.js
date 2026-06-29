const ASSET_MANIFEST = self.__STATIC_CONTENT_MANIFEST || {};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname === "/") {
      pathname = "/last-four-years.html";
    }

    const asset = await getAsset(env, pathname);
    if (asset) {
      return asset;
    }

    return new Response("Not found", { status: 404 });
  },
};

async function getAsset(env, pathname) {
  const key = pathname.replace(/^\/+/, "");
  const content = await env.ASSETS?.fetch?.(`https://assets.local/${key}`);
  if (content && content.status !== 404) return content;

  const manifestEntry = ASSET_MANIFEST[key];
  if (!manifestEntry) return null;

  return env.ASSETS.fetch(`https://assets.local/${manifestEntry}`);
}
