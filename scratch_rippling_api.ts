async function parseRipplingApiData() {
  const res = await fetch('https://ats.rippling.com/decisions/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    const data = JSON.parse(nextDataMatch[1]);
    const apiData = data.props?.pageProps?.apiData;
    console.log('apiData keys:', Object.keys(apiData || {}));
    if (apiData?.jobs) {
      console.log('apiData.jobs length:', apiData.jobs.length);
      console.log('Sample job:', apiData.jobs[0]);
    }
  }
}
parseRipplingApiData();
