// Loaded only by isolated integration tests; no production code imports this.
const original = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = String(input?.url || input);
  if (url.startsWith('https://api.github.com/')) {
    const name = new URL(url).pathname.split('/')[2];
    if (url.includes('/users/')) return Response.json({ id: { alice: 11, bob: 22, mallory: 33 }[name] || 44, login: name, avatar_url: '', html_url: `https://github.com/${name}` });
    if (url.includes('/repos/')) return Response.json({ id: 1, full_name: 'alice/project', private: false });
    return Response.json([]);
  }
  return original(input, options);
};
