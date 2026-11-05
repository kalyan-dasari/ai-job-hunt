async function parseRipplingQueryData() {
  const res = await fetch('https://ats.rippling.com/decisions/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    const data = JSON.parse(nextDataMatch[1]);
    const queries = data.props?.pageProps?.dehydratedState?.queries || [];
    console.log('Queries count:', queries.length);
    for (const q of queries) {
      console.log('QueryKey:', q.queryKey);
      if (q.state?.data) {
        console.log('QueryData keys:', Object.keys(q.state.data));
        if (Array.isArray(q.state.data)) {
          console.log('QueryData items:', q.state.data.length);
          console.log('Sample item:', q.state.data[0]);
        }
      }
    }
  }
}
parseRipplingQueryData();
