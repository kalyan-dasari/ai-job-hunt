async function testWorkableV3() {
  const accounts = ['pleo', 'safetyculture', 'supermetrics', 'homerun'];
  for (const acc of accounts) {
    try {
      const res = await fetch(`https://apply.workable.com/api/v3/accounts/${acc}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({ query: '', location: [], department: [], worktype: [], remote: [] }),
      });
      console.log(`POST api/v3/accounts/${acc}/jobs -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  results count: ${data.results?.length}, total: ${data.total}`);
        if (data.results?.length > 0) {
          console.log(`  First title: "${data.results[0].title}", location: ${JSON.stringify(data.results[0].location)}`);
        }
      }
    } catch (e: any) {
      console.log(`Error on ${acc}: ${e.message}`);
    }
  }
}
testWorkableV3();
