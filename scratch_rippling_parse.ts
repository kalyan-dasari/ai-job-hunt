import { jsonLdExtractor } from './server/job-sources/discovery/jsonld-extractor.ts';

async function parseRipplingHtml() {
  const res = await fetch('https://ats.rippling.com/decisions/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  console.log('Decisions HTML length:', html.length);

  // Check JSON-LD
  const jsonLdJobs = jsonLdExtractor.extract(html, 'https://ats.rippling.com/decisions/jobs', 'Decisions');
  console.log('JSON-LD jobs extracted:', jsonLdJobs.length);
  if (jsonLdJobs.length > 0) {
    console.log('Sample JSON-LD job:', jsonLdJobs[0].title, jsonLdJobs[0].url);
  }

  // Check __NEXT_DATA__
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      console.log('Next.js pageProps keys:', Object.keys(data.props?.pageProps || {}));
      const jobs = data.props?.pageProps?.initialData?.jobs || data.props?.pageProps?.jobs;
      console.log('Jobs in Next.js props:', Array.isArray(jobs) ? jobs.length : typeof jobs);
      if (Array.isArray(jobs) && jobs.length > 0) {
        console.log('Sample job in Next.js props:', jobs[0].name || jobs[0].title);
      }
    } catch (e: any) {
      console.log('Error parsing Next data:', e.message);
    }
  }
}
parseRipplingHtml();
