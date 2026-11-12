import { careerPageCrawler } from '../server/job-sources/discovery/crawler.ts';

const URLS = [
  { name: 'BrowserStack', url: 'https://www.browserstack.com/careers' },
  { name: 'Postman', url: 'https://www.postman.com/company/careers/' },
  { name: 'Hasura', url: 'https://hasura.io/careers' },
  { name: 'Urban Company', url: 'https://www.urbancompany.com/careers' },
  { name: 'Zepto', url: 'https://www.zeptonow.com/careers' },
  { name: 'CleverTap', url: 'https://clevertap.com/careers/' },
  { name: 'MoEngage', url: 'https://www.moengage.com/careers/' },
  { name: 'Yellow.ai', url: 'https://yellow.ai/careers/' },
  { name: 'Groww', url: 'https://groww.in/careers' },
  { name: 'HackerEarth', url: 'https://www.hackerearth.com/careers/' },
  { name: 'UrbanPiper', url: 'https://www.urbanpiper.com/careers' },
  { name: 'Shiprocket', url: 'https://www.shiprocket.in/careers/' },
  { name: 'Licious', url: 'https://www.licious.in/careers' },
];

async function detectAll() {
  console.log('Detecting ATS / JSON-LD across candidate URLs...\n');
  for (const item of URLS) {
    try {
      const res = await careerPageCrawler.detectCareersPageAndAts(item.url);
      console.log(`[RESULT] ${item.name.padEnd(16)} -> Careers URL: ${res.careersUrl || 'N/A'}`);
      if (res.detectedAts) {
        console.log(`         ATS DETECTED: provider=${res.detectedAts.provider}, slug=${res.detectedAts.slug}, confidence=${res.detectedAts.confidence}`);
      }
      if (res.jsonLdJobsFound > 0) {
        console.log(`         JSON-LD JOBS: ${res.jsonLdJobsFound}`);
      }
    } catch (err: any) {
      console.log(`[ERROR]  ${item.name.padEnd(16)} -> ${err.message}`);
    }
  }
}

detectAll();
