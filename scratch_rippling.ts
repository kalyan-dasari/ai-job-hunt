async function probeRippling() {
  const urls = [
    'https://ats.rippling.com/talentneuron/jobs',
    'https://api.rippling.com/platform/api/ats/v1/board/talentneuron/jobs',
    'https://ats.rippling.com/api/v1/board/talentneuron/jobs',
    'https://ats.rippling.com/decisions/jobs',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/html',
        }
      });
      console.log(`URL: ${u} -> Status: ${res.status}, Type: ${res.headers.get('content-type')}`);
      const text = await res.text();
      console.log(`  Length: ${text.length}, Snippet: ${text.slice(0, 150).replace(/\s+/g, ' ')}`);
      // Check if text has embedded JSON or schema.org
      if (text.includes('schema.org') || text.includes('JobPosting') || text.includes('__NEXT_DATA__')) {
        console.log('  -> Contains structured data or Next.js payload!');
      }
    } catch (e: any) {
      console.log(`Error on ${u}: ${e.message}`);
    }
  }
}
probeRippling();
