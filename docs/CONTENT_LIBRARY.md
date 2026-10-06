# Course library and provenance, v0.2.0

Checked October 4, 2026. **121 catalogue entries, nine universities, 103 course starter packs plus General Play.** Presets reuse a bank of introductory concepts: **242 distinct cards including 18 fictional General Play cards**, with 4,467 card placements across all presets. Reuse is intentional; this does not represent 103 independently written courses. CWRU COGS 101 has 51 cards.

| School | Listed entries | Primary reference |
| --- | ---: | --- |
| Case Western Reserve University | 58 | [COGS catalogue](https://bulletin.case.edu/course-descriptions/cogs/) |
| UC San Diego | 23 | [COGS courses](https://catalog.ucsd.edu/courses/COGS.html) |
| Massachusetts Institute of Technology | 10 | [Brain and Cognitive Sciences](https://catalog.mit.edu/subjects/9/) |
| Indiana University Bloomington | 8 | [Cognitive Science minor course list](https://bulletin.college.indiana.edu/programs/4268/cogsmin) |
| University of Pennsylvania | 3 | [COGS courses](https://catalog.upenn.edu/courses/cogs/) |
| Yale University | 6 | [CGSC courses](https://catalog.yale.edu/ycps/courses/cgsc/) |
| University of Michigan | 4 | [Cognitive Science degree requirements](https://lsa.umich.edu/lsa/academics/majors-minors/cognitive-science-major.html) |
| UC Davis | 4 | [Psychology courses](https://catalog.ucdavis.edu/courses-subject-code/psc/) |
| Johns Hopkins University | 5 | [Cognitive Science catalogue](https://e-catalogue.jhu.edu/course-descriptions/cognitive_science/) |

The CWRU list contains all **COGS** entries on the referenced page, not every department at CWRU. Other schools have selected cognitive-science-related courses, not complete institutional catalogues. A listing does not guarantee current availability. Yale uses current four-digit codes. JHU's historical AS.050.101 was excluded because it appears as a prerequisite rather than a current heading.

`tools/research-catalogues.mjs` records direct extraction under `research/catalogues`. `tools/compile-catalogue.mjs` compiles the curated set to `src/server/catalogue-data.json`. Direct extraction did not parse Penn/JHU headings; their selected titles were checked separately against official web search/page results. Michigan, Davis and IU selections were also checked from the primary pages. No private syllabus, assessment bank, lecture slides or full catalogue descriptions are included.

## What a starter means

A starter contains **shared foundational practice in the selected topics**. Even a graduate course's starter is introductory vocabulary or methods, not graduate-level coverage or instructor-approved material. The picker, pack description and course studio explain this. Eighteen highly specific, independent-study or thesis entries show **Add your materials** instead of a playable starter.

Import your own authorized notes to align the game with a real class. You can make a pack for any university or subject. Imported passages are displayed for review; editing a draft clears its review flag. Packs need 6/12/18 distinct cards for four/six/ten rounds. Difficulty controls memory load and timing separately from course selection.

## Concept references

Cards use original short wording, checked against introductory sources. Each carries its reference, shown in the reveal.

- [OpenStax Psychology 2e](https://openstax.org/details/books/psychology-2e): research design/ethics (2.2–2.4), cells/brain (3.2/3.4), sensation/perception/vision/Gestalt (5.1/5.3/5.6), learning (6.2/6.3), cognition/language/reasoning (7.1–7.3), memory/brain/errors/strategies (8.1–8.4), development (9.2), and social/group behavior (12.1/12.4).
- [OpenStax Biology 2e, population evolution](https://openstax.org/books/biology-2e/pages/19-1-population-evolution).
- Google Developers: [introductory machine learning](https://developers.google.com/machine-learning/intro-to-ml/what-is-ml), [data splits](https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets), [overfitting](https://developers.google.com/machine-learning/crash-course/overfitting/overfitting), [classification metrics](https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall).
- Miller, Stroop, Luck & Vogel, and Weldon & Bellinger references in the original design plan. The arrow-position adaptation links to [research on location, words and arrows](https://pubmed.ncbi.nlm.nih.gov/31956922/); it does not replicate a standard experiment.

See [third-party notices](../THIRD_PARTY_NOTICES.md). Current source-page terms govern the cited texts; the app does not bundle them or fetch them for AI. Exact-passage validation can catch invented quotes but cannot establish factual support or good distractors automatically. Creator review remains required.
