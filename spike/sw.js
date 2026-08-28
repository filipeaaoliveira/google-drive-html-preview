// Run from the service worker console:  spike('<FILE_ID>')
globalThis.spike = async function spike(fileId) {
  const url =
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;
  const response = await fetch(url, { credentials: 'include', redirect: 'follow' });
  const body = await response.text();
  const verdict = {
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get('Content-Type'),
    contentDisposition: response.headers.get('Content-Disposition'),
    bodyLength: body.length,
    looksLikeLoginPage: /accounts\.google\.com|ServiceLogin/i.test(body),
    head: body.slice(0, 300)
  };
  console.log(verdict);
  return verdict;
};
