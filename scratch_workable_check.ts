async function testWorkableAccounts() {
  const accounts = ['fortanix', 'mercari-india', 'apna', 'innovaccer-analytics', 'youtrip'];
  for (const acc of accounts) {
    try {
      const resV1 = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${acc}?details=true`);
      if (resV1.ok) {
        const d = await resV1.json();
        console.log(`V1 ${acc}: ${d.jobs?.length || 0} jobs`);
      }
      const resV3 = await fetch(`https://apply.workable.com/api/v3/accounts/${acc}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });
      if (resV3.ok) {
        const d = await resV3.json();
        console.log(`V3 ${acc}: ${d.results?.length || 0} jobs (total ${d.total})`);
        if (d.results?.length > 0) {
          console.log(`  First: "${d.results[0].title}" in ${d.results[0].location?.city || d.results[0].location?.country}`);
        }
      }
    } catch (e: any) {
      console.log(`Error on ${acc}: ${e.message}`);
    }
  }
}
testWorkableAccounts();
