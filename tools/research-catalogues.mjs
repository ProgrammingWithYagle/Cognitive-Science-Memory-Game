// Extract factual course codes/titles from official catalogues; never scrape syllabi.
import { mkdir, writeFile } from 'node:fs/promises';
const sources = [
 ['cwru', 'Case Western Reserve University', 'https://bulletin.case.edu/course-descriptions/cogs/'],
 ['ucsd', 'UC San Diego', 'https://catalog.ucsd.edu/courses/COGS.html'],
 ['mit', 'Massachusetts Institute of Technology', 'https://catalog.mit.edu/subjects/9/'],
 ['penn', 'University of Pennsylvania', 'https://catalog.upenn.edu/courses/cogs/'],
 ['jhu', 'Johns Hopkins University', 'https://e-catalogue.jhu.edu/course-descriptions/cognitive_science/'],
 ['yale', 'Yale University', 'https://catalog.yale.edu/ycps/courses/cgsc/'],
];
const clean = s => s.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&ndash;|&#8211;/g,'–').replace(/&rsquo;|&#8217;/g,"'").replace(/\s+/g,' ').trim();
await mkdir('research/catalogues', { recursive: true });
for (const [id,school,url] of sources) {
 try {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error('HTTP '+response.status);
  const html = await response.text();
  const blocks = [...html.matchAll(/<(?:p|h[2-5])\b[^>]*>([\s\S]*?)<\/(?:p|h[2-5])>/gi)].map(m=>clean(m[1]));
  const titles = blocks.filter(t => /^(?:COGS\s*[-–]?\s*\d|9\.\w+\s|AS\.050\.\d|CGSC\s*\d)/.test(t) && t.length < 450);
  await writeFile(`research/catalogues/${id}.json`, JSON.stringify({school,url,checked:'2026-10-04',titles},null,2)+'\n');
  console.log(JSON.stringify({id,school,titles}));
 } catch(e) { console.log(JSON.stringify({id,error:e.message})); }
}
