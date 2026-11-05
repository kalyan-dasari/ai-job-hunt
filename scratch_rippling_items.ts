async function parseRipplingItems() {
  const res = await fetch('https://ats.rippling.com/decisions/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    const data = JSON.parse(nextDataMatch[1]);
    const queries = data.props?.pageProps?.dehydratedState?.queries || [];
    const jobQuery = queries.find((q: any) => q.queryKey?.[2] === 'job-posts');
    if (jobQuery) {
      console.log('Total items:', jobQuery.state.data.totalItems);
      console.log('Items count:', jobQuery.state.data.items?.length);
      if (jobQuery.state.data.items?.length > 0) {
        console.log('Sample item:', JSON.stringify(jobQuery.state.data.items[0], null, 2));
      }
    }
  }
}
parseRipplingItems();
