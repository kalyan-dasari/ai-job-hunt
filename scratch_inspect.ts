async function inspectWorkableAndWorkday() {
  const wRes = await fetch('https://apply.workable.com/api/v1/widget/accounts/browserstack?details=true');
  const wData = await wRes.json();
  console.log('Workable name:', wData.name);
  console.log('Workable jobs length:', wData.jobs?.length);
  if (wData.jobs?.length > 0) {
    console.log('Sample Workable job:', wData.jobs[0]);
  }

  const wdRes = await fetch('https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: '' }),
  });
  const wdData = await wdRes.json();
  console.log('Workday jobPostings length:', wdData.jobPostings?.length);
  if (wdData.jobPostings?.length > 0) {
    console.log('Sample Workday job:', wdData.jobPostings[0]);
  }
}

inspectWorkableAndWorkday();
