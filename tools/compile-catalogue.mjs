import { readFile, writeFile } from 'node:fs/promises';
const courses=[];
const add=(school,catalogue,id,code,title,topics=[])=>courses.push({id,school,code,title,catalogue,checked:'2026-10-04',topics,...(topics.length?{packId:id}:{})});
const cwru=JSON.parse(await readFile('research/catalogues/cwru.json','utf8'));
const cwruTopics={101:['intro'],102:['neuro'],201:['development','evolution'],202:['social','language'],205:['perception','reasoning','research'],215:['language'],250:['computing','research'],251:['perception'],303:['computing'],305:['social','neuro'],306:['language'],307:['language'],308:['research'],309:['research'],311:['social','perception'],312:['language','development'],315:['computing','intro'],316:['reasoning','research'],317:['social','development'],319:['reasoning','perception'],322:['memory','learning'],327:['language','perception'],330:['computing'],331:['language'],378:['computing','neuro'],390:['language','social']};
for(const heading of cwru.titles){const m=heading.match(/^COGS (\w+)\. (.+?)\. (?:\d|1 -)/);if(!m)throw new Error('Unrecognized CWRU heading '+heading);
 const code=m[1],base=Number(code)>=400&&Number(code)<500?Number(code)-100:Number(code);
 add(cwru.school,cwru.url,'cwru'+code,'COGS '+code,m[2],cwruTopics[base]??[]);
}
const ucsd=JSON.parse(await readFile('research/catalogues/ucsd.json','utf8'));
const ucsdTopics={'1':['intro'],'11':['neuro','memory'],'12':['language','social'],'14A':['research'],'14B':['statistics','research'],'17':['neuro'],'101A':['perception'],'101B':['memory','learning'],'101C':['language'],'107A':['neuro'],'107B':['neuro','perception'],'107C':['neuro','memory'],'110':['development','language'],'118A':['computing'],'118B':['computing'],'150':['computing','language'],'153':['language','memory'],'156':['language','development'],'165':['neuro','research'],'180':['reasoning'],'181':['computing','neuro'],'182':['computing','learning'],'188':['computing']};
for(const heading of ucsd.titles){const m=heading.match(/^COGS ([\w-]+)\. (.+?) \(/);if(m&&ucsdTopics[m[1]])add(ucsd.school,ucsd.url,'ucsd'+m[1],'COGS '+m[1],m[2],ucsdTopics[m[1]]);}
const mit=JSON.parse(await readFile('research/catalogues/mit.json','utf8'));
const mitTopics={'9.00':['intro'],'9.01':['neuro'],'9.012':['intro'],'9.07':['statistics','research'],'9.13':['neuro'],'9.19':['language','computing'],'9.35':['perception'],'9.39':['language','neuro'],'9.40':['computing','neuro'],'9.85':['development','language']};
for(const heading of mit.titles){const m=heading.match(/^(9\.\w+) (.+)$/);if(m&&mitTopics[m[1]])add(mit.school,mit.url,'mit'+m[1].replace('.','-'),m[1],m[2],mitTopics[m[1]]);}
function school(name,url,prefix,rows){for(const [code,title,topics] of rows)add(name,url,prefix+code.replace(/[^\w]/g,'-').toLowerCase(),code,title,topics);}
school('Indiana University Bloomington','https://bulletin.college.indiana.edu/programs/4268/cogsmin','iu-',[
 ['COGS-Q 101','Introduction to Cognitive Science',['intro']],['COGS-Q 301','Brain and Cognition',['neuro']],['COGS-Q 330','Perception/Action',['perception']],
 ['COGS-Q 351','Introduction to Artificial Intelligence and Computer Simulation',['computing']],['COGS-Q 355','Neural Networks and the Brain',['computing','neuro']],
 ['COGS-Q 360','Autonomous Robotics',[]],['COGS-Q 370','Experiments and Models in Cognition',['research','intro']],['COGS-Q 380','Evolution of Human Cognition',['evolution','social']],
]);
courses.find(c=>c.id==='iu-cogs-q-101').id='iu101';courses.find(c=>c.id==='iu101').packId='iu101';
school('University of Pennsylvania','https://catalog.upenn.edu/courses/cogs/','penn-',[
 ['COGS 1001','Introduction to Cognitive Science',['intro']],['COGS 1770','Research Practicum in Cognitive Science',['research']],['COGS 4290','Big Data, Memory and the Human Brain',['memory','computing']],
]);
school('Yale University','https://catalog.yale.edu/ycps/courses/cgsc/','yale-',[
 ['CGSC 1100','Introduction to Cognitive Science',['intro']],['CGSC 1390','Mental Lives of Babies and Animals',['development','evolution']],
 ['CGSC 2160','Cognitive Science of Language',['language']],['CGSC 2740','Algorithms of the Mind',['computing','perception']],
 ['CGSC 3240','Human Neuropsychology',['neuro']],['CGSC 3550','Inside the Hive Mind: The Psychology of Group Life',['social']],
]);
school('University of Michigan','https://lsa.umich.edu/lsa/academics/majors-minors/cognitive-science-major.html','mich-',[
 ['COGSCI 200','Introduction to Cognitive Science',['intro']],['PSYCH 240','Introduction to Cognitive Psychology',['memory','reasoning','perception']],
 ['PSYCH 345','Introduction to Human Neuropsychology',['neuro']],['COGSCI 445','Introduction to Machine Learning for Natural Language Processing',['computing','language']],
]);
school('UC Davis','https://catalog.ucdavis.edu/courses-subject-code/psc/','davis-',[
 ['PSC 100','Introduction to Cognitive Psychology',['memory','reasoning','perception']],['PSC 135','Cognitive Neuroscience: The Biological Foundations of the Mind',['neuro']],
 ['PSC 041','Research Methods in Psychology',['research']],['PSC 132','Language & Cognition',['language']],
]);
school('Johns Hopkins University','https://e-catalogue.jhu.edu/course-descriptions/cognitive_science/','jhu-',[
 ['AS.050.116','Visual Cognition',['perception']],['AS.050.202','Introduction to Computational Cognitive Science',['computing','intro']],
 ['AS.050.203','Neuroscience: Cognitive',['neuro']],['AS.050.326','Foundations of Cognitive Science',['intro']],['AS.050.333','Psycholinguistics',['language','memory']],
]);
if(new Set(courses.map(c=>c.id)).size!==courses.length)throw new Error('Duplicate course IDs');
await writeFile('src/server/catalogue-data.json',JSON.stringify(courses,null,2)+'\n');
console.log(JSON.stringify({courses:courses.length,schools:new Set(courses.map(c=>c.school)).size,starters:courses.filter(c=>c.packId).length,cwru:courses.filter(c=>c.school===cwru.school).length}));
