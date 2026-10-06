import type { ContentPack, CourseInfo, Fact, PackInfo } from "../shared/types";
import catalogue from "./catalogue-data.json";
import { KNOWLEDGE } from "./knowledge";
export const SOURCES = {
  memory:
    "https://openstax.org/books/psychology-2e/pages/8-1-how-memory-functions",
  cognition:
    "https://openstax.org/books/psychology-2e/pages/7-1-what-is-cognition",
  language: "https://openstax.org/books/psychology-2e/pages/7-2-language",
  cells:
    "https://openstax.org/books/psychology-2e/pages/3-2-cells-of-the-nervous-system",
  brain:
    "https://openstax.org/books/psychology-2e/pages/3-4-the-brain-and-spinal-cord",
  development:
    "https://openstax.org/books/psychology-2e/pages/9-2-lifespan-theories",
  evolution:
    "https://openstax.org/books/biology-2e/pages/19-1-population-evolution",
  social:
    "https://openstax.org/books/psychology-2e/pages/12-1-what-is-social-psychology",
  chunking: "https://psychclassics.yorku.ca/Miller/",
  stroop: "https://psychclassics.yorku.ca/Stroop/",
  spatial: "https://pubmed.ncbi.nlm.nih.gov/31956922/",
  collective:
    "https://marcuse.faculty.history.ucsb.edu/classes/201/articles/97CollMemWeldonBellingerJnlExpPsych.pdf",
  visual:
    "https://awhvogellab.com/files/pdfs/luck_1997_capacity-features-conjuctions.pdf",
};
type Row = [string, string, string, string, string];
function rows(source: string, values: Row[]): Fact[] {
  return values.map((r, i) => ({
    id: source.split("/").pop() + "-" + i,
    cue: r[0],
    answer: r[1],
    alternatives: r.slice(2),
    explanation: `${r[0]}: ${r[1]}.`,
    source,
  }));
}
const memory = rows(SOURCES.memory, [
  [
    "Getting information into memory",
    "Encoding",
    "Retrieval",
    "Storage",
    "Recognition",
  ],
  [
    "Keeping encoded information over time",
    "Storage",
    "Encoding",
    "Retrieval",
    "Attention",
  ],
  [
    "Bringing stored information back to mind",
    "Retrieval",
    "Storage",
    "Encoding",
    "Sensation",
  ],
  [
    "Memory for personally experienced events",
    "Episodic memory",
    "Semantic memory",
    "Procedural memory",
    "Sensory memory",
  ],
  [
    "Memory for general knowledge and concepts",
    "Semantic memory",
    "Episodic memory",
    "Procedural memory",
    "Sensory memory",
  ],
  [
    "Memory expressed through learned skills",
    "Procedural memory",
    "Episodic memory",
    "Semantic memory",
    "Sensory memory",
  ],
  [
    "Identifying something encountered before",
    "Recognition",
    "Free recall",
    "Encoding",
    "Rehearsal",
  ],
  [
    "Retrieving information without being shown the answer",
    "Recall",
    "Recognition",
    "Storage",
    "Sensation",
  ],
]);
const cognition = rows(SOURCES.cognition, [
  [
    "A mental grouping of related things",
    "Concept",
    "Neuron",
    "Reflex",
    "Axon",
  ],
  [
    "A particularly representative category example",
    "Prototype",
    "Algorithm",
    "Synapse",
    "Reflex",
  ],
  [
    "A mental framework for organizing knowledge",
    "Schema",
    "Axon",
    "Myelin",
    "Synapse",
  ],
  [
    "Cognitive activities include remembering, thinking, and using this",
    "Language",
    "Myelin",
    "Spinal fluid",
    "Muscle tone",
  ],
]);
const language = rows(SOURCES.language, [
  [
    "Rules for arranging words in sentences",
    "Syntax",
    "Semantics",
    "Phoneme",
    "Morpheme",
  ],
  [
    "The meaning of words and sentences",
    "Semantics",
    "Syntax",
    "Phoneme",
    "Myelin",
  ],
  [
    "A basic sound unit in a language",
    "Phoneme",
    "Morpheme",
    "Sentence",
    "Schema",
  ],
  [
    "A smallest language unit that carries meaning",
    "Morpheme",
    "Phoneme",
    "Neuron",
    "Reflex",
  ],
  [
    "A system for communicating with words",
    "Language",
    "Myelin",
    "Cerebellum",
    "Synapse",
  ],
  [
    "Grammar includes rules for word order and these word parts",
    "Morphemes",
    "Axons",
    "Dendrites",
    "Lobes",
  ],
]);
const principles = [
  ...rows(SOURCES.chunking, [
    [
      "Grouping several elements into a meaningful unit",
      "Chunking",
      "Reuptake",
      "Reflex",
      "Mutation",
    ],
    [
      "A grouped unit used in remembering",
      "Chunk",
      "Axon",
      "Allele",
      "Phoneme",
    ],
  ]),
  ...rows(SOURCES.stroop, [
    [
      "In an ink-color task, the competing word can cause this",
      "Interference",
      "Myelination",
      "Mutation",
      "Assimilation",
    ],
    [
      "In a Stroop color task, the property to name",
      "Ink color",
      "Word meaning",
      "Word length",
      "Letter order",
    ],
  ]),
  ...rows(SOURCES.collective, [
    [
      "Recalling together through group discussion",
      "Collaborative recall",
      "Individual recall",
      "Reflex action",
      "Natural selection",
    ],
    [
      "Pooling separate individual recalls without discussion",
      "Nominal group",
      "Collaborative group",
      "Control neuron",
      "Motor cortex",
    ],
  ]),
];
const cells = rows(SOURCES.cells, [
  [
    "A nervous-system cell that processes and transmits information",
    "Neuron",
    "Allele",
    "Schema",
    "Phoneme",
  ],
  [
    "Branching neuron structures that commonly receive input",
    "Dendrites",
    "Axons",
    "Myelin",
    "Vesicles",
  ],
  [
    "A neuron extension that carries signals toward its terminals",
    "Axon",
    "Dendrite",
    "Morpheme",
    "Schema",
  ],
  [
    "Insulating material around many axons",
    "Myelin",
    "Syntax",
    "Allele",
    "Cortex",
  ],
  [
    "Chemical messengers released at many synapses",
    "Neurotransmitters",
    "Morphemes",
    "Chromosomes",
    "Concepts",
  ],
  [
    "The tiny space across a chemical synapse",
    "Synaptic cleft",
    "Frontal lobe",
    "Cerebellum",
    "Occipital lobe",
  ],
  [
    "A brief electrical signal along an axon",
    "Action potential",
    "Schema",
    "Syntax",
    "Mutation",
  ],
  [
    "Cells that support, nourish, and insulate neurons",
    "Glia",
    "Alleles",
    "Phonemes",
    "Concepts",
  ],
]);
const brain = rows(SOURCES.brain, [
  [
    "Brain lobe containing primary visual cortex",
    "Occipital",
    "Frontal",
    "Parietal",
    "Temporal",
  ],
  [
    "Brain lobe containing primary auditory cortex",
    "Temporal",
    "Occipital",
    "Frontal",
    "Parietal",
  ],
  [
    "Brain lobe containing primary motor cortex",
    "Frontal",
    "Occipital",
    "Temporal",
    "Parietal",
  ],
  [
    "Brain lobe containing primary somatosensory cortex",
    "Parietal",
    "Temporal",
    "Occipital",
    "Frontal",
  ],
  [
    "Structure strongly involved in balance and coordination",
    "Cerebellum",
    "Corpus callosum",
    "Occipital lobe",
    "Synaptic cleft",
  ],
  [
    "A major connection between cerebral hemispheres",
    "Corpus callosum",
    "Cerebellum",
    "Dendrite",
    "Synaptic cleft",
  ],
  [
    "Outer layer of the cerebrum",
    "Cerebral cortex",
    "Myelin sheath",
    "Spinal cord",
    "Synaptic cleft",
  ],
  ["Imaging method using a strong magnetic field", "MRI", "EEG", "CT", "ECG"],
  ["Imaging method using X-rays", "CT", "MRI", "EEG", "ECG"],
  [
    "The brain and spinal cord form this system",
    "Central nervous system",
    "Peripheral nervous system",
    "Endocrine system",
    "Immune system",
  ],
]);
const development = rows(SOURCES.development, [
  [
    "In Piaget, the earliest stage centered on senses and actions",
    "Sensorimotor",
    "Preoperational",
    "Concrete operational",
    "Formal operational",
  ],
  [
    "In Piaget, the stage associated with growing symbolic thought",
    "Preoperational",
    "Sensorimotor",
    "Concrete operational",
    "Formal operational",
  ],
  [
    "In Piaget, logical operations on concrete situations",
    "Concrete operational",
    "Sensorimotor",
    "Preoperational",
    "Formal operational",
  ],
  [
    "In Piaget, abstract and hypothetical reasoning",
    "Formal operational",
    "Sensorimotor",
    "Preoperational",
    "Concrete operational",
  ],
  [
    "In Piaget, fitting experience into an existing schema",
    "Assimilation",
    "Accommodation",
    "Reuptake",
    "Mutation",
  ],
  [
    "In Piaget, changing a schema for new experience",
    "Accommodation",
    "Assimilation",
    "Reuptake",
    "Mutation",
  ],
  [
    "Understanding that an unseen object continues to exist",
    "Object permanence",
    "Reuptake",
    "Natural selection",
    "Syntax",
  ],
  [
    "In Piaget, quantity can stay constant when appearance changes",
    "Conservation",
    "Assimilation",
    "Myelination",
    "Mutation",
  ],
  [
    "In Piaget, a mental framework for interpreting experience",
    "Schema",
    "Synapse",
    "Axon",
    "Allele",
  ],
  [
    "Piaget described children as actively constructing this",
    "Knowledge",
    "Myelin",
    "Neurotransmitters",
    "Alleles",
  ],
]);
const evolution = rows(SOURCES.evolution, [
  [
    "A change in population allele frequencies over generations",
    "Evolution",
    "Rehearsal",
    "Assimilation",
    "Reuptake",
  ],
  ["A version of a gene", "Allele", "Axon", "Schema", "Phoneme"],
  [
    "Random changes in population allele frequencies",
    "Genetic drift",
    "Natural selection",
    "Assimilation",
    "Rehearsal",
  ],
  [
    "Movement of alleles between populations",
    "Gene flow",
    "Reuptake",
    "Encoding",
    "Syntax",
  ],
  [
    "A change in DNA sequence",
    "Mutation",
    "Chunking",
    "Recognition",
    "Rehearsal",
  ],
  [
    "Differential reproductive success related to heritable traits",
    "Natural selection",
    "Recognition",
    "Rehearsal",
    "Reuptake",
  ],
  [
    "Evolution is measured across these, rather than one individual lifetime",
    "Generations",
    "Synapses",
    "Phonemes",
    "Seconds",
  ],
  [
    "The group whose allele frequencies are studied",
    "Population",
    "Neuron",
    "Morpheme",
    "Schema",
  ],
]);
const social = rows(SOURCES.social, [
  [
    "Study of how social contexts influence thinking and behavior",
    "Social psychology",
    "Phonology",
    "Genetics",
    "Neuroanatomy",
  ],
  [
    "Explaining behavior in terms of the surrounding context",
    "Situationism",
    "Dispositionism",
    "Syntax",
    "Reuptake",
  ],
  [
    "Explaining behavior in terms of internal characteristics",
    "Dispositionism",
    "Situationism",
    "Syntax",
    "Reuptake",
  ],
  [
    "An explanation assigned to a behavior or event",
    "Attribution",
    "Allele",
    "Axon",
    "Phoneme",
  ],
  [
    "Overemphasizing personal traits when explaining others' behavior",
    "Fundamental attribution error",
    "Gene flow",
    "Object permanence",
    "Conservation",
  ],
  [
    "Attributing successes internally and failures externally",
    "Self-serving bias",
    "Reuptake",
    "Mutation",
    "Chunking",
  ],
]);
const lab = rows("Fictional field notes created for Mind Mosaic", [
  ["The lab mascot", "Otter", "Fox", "Robin", "Badger"],
  ["The greenhouse password", "Sunflower", "Clover", "Willow", "Daisy"],
  ["The delivery day", "Tuesday", "Monday", "Thursday", "Friday"],
  ["The reading-room snack", "Pear", "Apple", "Plum", "Peach"],
  ["The meeting-room name", "Juniper", "Willow", "Maple", "Aspen"],
  ["The festival drink", "Lemonade", "Tea", "Cocoa", "Coffee"],
  ["The garden gate color", "Coral", "Teal", "Gold", "Blue"],
  ["The welcome-desk object", "Bell", "Lamp", "Clock", "Mug"],
  ["The expedition destination", "Island", "Desert", "Mountain", "Forest"],
  ["The library closing time", "Six", "Five", "Seven", "Eight"],
  ["The courier vehicle", "Bicycle", "Boat", "Train", "Van"],
  ["The team badge shape", "Triangle", "Circle", "Square", "Star"],
  ["The observatory pet", "Turtle", "Rabbit", "Cat", "Dog"],
  ["The studio instrument", "Flute", "Piano", "Violin", "Drum"],
  ["The picnic location", "Meadow", "Beach", "Forest", "Garden"],
  ["The workshop material", "Clay", "Wood", "Paper", "Glass"],
  ["The telescope name", "Comet", "Orbit", "Nova", "Lunar"],
  ["The tiny robot name", "Pip", "Dot", "Milo", "Bean"],
]);
function pack(
  id: string,
  name: string,
  school: string,
  course: string,
  description: string,
  facts: Fact[],
  catalogue?: string,
): ContentPack {
  return {
    version: 1,
    id,
    name,
    school,
    course,
    description,
    catalogue,
    facts: facts.map((f, i) => ({ ...f, id: `${id}-${i}` })),
  };
}
export const COURSES: CourseInfo[] = catalogue;
const banks: Record<string, Fact[]> = {
  intro: [
    ...memory,
    ...cognition,
    ...language,
    ...principles,
    ...cells,
    ...KNOWLEDGE.perception.slice(0, 8),
    ...KNOWLEDGE.reasoning,
  ],
  memory: [...memory, ...KNOWLEDGE.memory, ...principles],
  language: [...language, ...KNOWLEDGE.language, ...cognition],
  neuro: [
    ...cells,
    ...brain,
    ...KNOWLEDGE.memory.slice(-5),
    ...KNOWLEDGE.perception.slice(12, 22),
  ],
  development: [
    ...development,
    ...language,
    ...KNOWLEDGE.language,
    ...KNOWLEDGE.learning,
  ],
  evolution: [...evolution, ...development],
  social: [
    ...social,
    ...KNOWLEDGE.social,
    ...language,
    ...KNOWLEDGE.language,
    ...principles,
  ],
  learning: KNOWLEDGE.learning,
  perception: KNOWLEDGE.perception,
  research: KNOWLEDGE.research,
  reasoning: [...KNOWLEDGE.reasoning, ...cognition, ...memory],
  statistics: [...KNOWLEDGE.statistics, ...KNOWLEDGE.research],
  computing: KNOWLEDGE.computing,
};
export const PACKS: ContentPack[] = [
  pack(
    "general",
    "General Play",
    "Everyday adventures",
    "",
    "Fictional field notes. No course knowledge needed.",
    lab,
  ),
  ...COURSES.filter((c) => c.packId).map((c) => {
    const facts = [
      ...new Map(
        c.topics.flatMap((topic) => banks[topic] ?? []).map((f) => [f.cue, f]),
      ).values(),
    ].slice(0, 100);
    return pack(
      c.packId!,
      `${c.code} · ${c.title}`.slice(0, 80),
      c.school,
      c.code,
      "Foundational practice in " +
        c.topics.join(", ") +
        ". Catalogue-aligned starter, not a complete syllabus. Add your own course material.",
      facts,
      c.catalogue,
    );
  }),
];
export function packInfo(p: ContentPack): PackInfo {
  const { facts, ...meta } = p;
  return { ...meta, count: facts.length };
}
