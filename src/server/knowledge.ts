import type { Fact } from "../shared/types";
type Definition = [string, string, string?];
// Original short definitions, fact-checked against the linked educational sources.
// Distractors are other terms in the same unit, never fetched or drafted at runtime.
function unit(id: string, page: string, definitions: Definition[]): Fact[] {
  const source = page.startsWith("https:")
    ? page
    : `https://openstax.org/books/psychology-2e/pages/${page}`;
  const terms = [...new Set(definitions.map((r) => r[1]))];
  return definitions.map(([cue, answer, note], i) => ({
    id: `${id}-${i}`,
    cue,
    answer,
    alternatives: Array.from(
      { length: 3 },
      (_, n) => terms[(terms.indexOf(answer) + n + 1) % terms.length],
    ),
    explanation:
      note ?? `${answer} names this process or concept: ${cue.toLowerCase()}.`,
    source,
  }));
}
export const KNOWLEDGE = {
  language: unit("language-extra", "7-2-language", [
    ["The vocabulary available in a language", "Lexicon"],
    ["The rule system governing meaningful language combinations", "Grammar"],
    [
      "Applying a language rule to an exception, such as saying “goed”",
      "Overgeneralization",
    ],
    [
      "The proposal that language influences how people think",
      "Linguistic relativity",
      "This is an influence hypothesis; it does not mean people cannot think outside the words they know.",
    ],
    [
      "The stronger claim that language determines thought",
      "Linguistic determinism",
      "This strong claim is distinguished from weaker linguistic relativity and should not be assumed to be established.",
    ],
    ["A developmental period of repeated speech-like syllables", "Babbling"],
    [
      "Early speech that omits many small grammatical words",
      "Telegraphic speech",
    ],
    [
      "Learning the communication system used by a community",
      "Language acquisition",
    ],
  ]),
  computing: [
    ...unit(
      "ml-basics",
      "https://developers.google.com/machine-learning/intro-to-ml/what-is-ml",
      [
        [
          "Improving predictions or behavior by learning from data",
          "Machine learning",
        ],
        [
          "Learning from examples paired with desired outputs",
          "Supervised learning",
        ],
        [
          "Discovering patterns in examples without target labels",
          "Unsupervised learning",
        ],
        [
          "Learning actions through feedback about rewards",
          "Reinforcement learning",
        ],
        ["Predicting a numerical value such as temperature", "Regression"],
        ["Predicting a category such as a message type", "Classification"],
        ["An input attribute used by a prediction system", "Feature"],
        ["The target output paired with a supervised example", "Label"],
        ["The process of fitting model parameters from examples", "Training"],
        ["Using a trained model to produce an output", "Inference"],
      ],
    ),
    ...unit(
      "ml-evaluation",
      "https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets",
      [
        ["Data used to fit the model’s learned parameters", "Training set"],
        ["Held-out data used while selecting model settings", "Validation set"],
        ["Held-out data reserved for a final evaluation", "Test set"],
        [
          "Model choices set outside the learned fitting parameters",
          "Hyperparameters",
        ],
      ],
    ),
    ...unit(
      "ml-fit",
      "https://developers.google.com/machine-learning/crash-course/overfitting/overfitting",
      [
        [
          "Fitting training details that fail to transfer to new examples",
          "Overfitting",
        ],
        [
          "A model fails to capture useful patterns even in training",
          "Underfitting",
        ],
        [
          "Useful performance on examples outside the training data",
          "Generalization",
        ],
        [
          "Constraining a model to discourage unnecessary complexity",
          "Regularization",
        ],
      ],
    ),
    ...unit(
      "ml-metrics",
      "https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall",
      [
        ["The fraction of all classifications that are correct", "Accuracy"],
        [
          "The fraction of predicted positives that are truly positive",
          "Precision",
        ],
        ["The fraction of actual positives detected by a classifier", "Recall"],
        [
          "A prediction says positive when the actual case is negative",
          "False positive",
        ],
        [
          "A prediction says negative when the actual case is positive",
          "False negative",
        ],
        [
          "A positive prediction correctly identifies a positive case",
          "True positive",
        ],
      ],
    ),
  ],
  memory: [
    ...unit("memory-errors", "8-3-problems-with-memory", [
      [
        "Older learning disrupts recall of newer learning",
        "Proactive interference",
      ],
      [
        "Newer learning disrupts recall of older learning",
        "Retroactive interference",
      ],
      [
        "Difficulty forming new lasting declarative memories",
        "Anterograde amnesia",
      ],
      ["Loss of memories formed before an injury", "Retrograde amnesia"],
      [
        "Later misleading information alters an event recollection",
        "Misinformation effect",
      ],
      [
        "An experience was never adequately recorded in memory",
        "Encoding failure",
      ],
      [
        "Retrieving a past event by piecing its elements together",
        "Memory reconstruction",
      ],
      [
        "Outside suggestions can distort what someone remembers",
        "Suggestibility",
      ],
      ["Remembering an event that never occurred", "False memory"],
      ["A temporary inability to retrieve a known name", "Blocking"],
    ]),
    ...unit("memory-tools", "8-4-ways-to-enhance-memory", [
      [
        "Connecting new learning to meaningful existing knowledge",
        "Elaborative rehearsal",
      ],
      ["Repeating information to keep it available", "Rehearsal"],
      [
        "Using a familiar route to organize items to remember",
        "Method of loci",
      ],
      ["A memory aid such as an acronym or rhyme", "Mnemonic"],
      ["Remembering the beginning of a list especially well", "Primacy effect"],
      ["Remembering the end of a list especially well", "Recency effect"],
      [
        "Better memory when material is related to oneself",
        "Self-reference effect",
      ],
      [
        "Breaking a study period into separated sessions",
        "Distributed practice",
      ],
    ]),
    ...unit("memory-brain", "8-2-parts-of-the-brain-involved-with-memory", [
      [
        "Brain structure important for forming new declarative memories",
        "Hippocampus",
        "The hippocampus supports formation and consolidation; long-term memories are not all stored in one place.",
      ],
      ["Brain structure strongly involved in learned fear", "Amygdala"],
      ["Stabilizing new learning into lasting memory", "Memory consolidation"],
      ["A proposed physical neural representation of a memory", "Engram"],
      [
        "Vivid recollection of learning about a striking event",
        "Flashbulb memory",
        "Vividness and confidence do not guarantee that all remembered details are accurate.",
      ],
    ]),
  ],
  learning: [
    ...unit("classical", "6-2-classical-conditioning", [
      ["Learning that one stimulus predicts another", "Classical conditioning"],
      [
        "A stimulus that naturally elicits a response before learning",
        "Unconditioned stimulus",
      ],
      [
        "An unlearned reaction to an unconditioned stimulus",
        "Unconditioned response",
      ],
      [
        "A formerly neutral cue that elicits a learned response",
        "Conditioned stimulus",
      ],
      ["A learned reaction to a conditioned stimulus", "Conditioned response"],
      ["Initial formation of a learned stimulus association", "Acquisition"],
      [
        "A conditioned response weakens when its cue is no longer paired",
        "Extinction",
      ],
      [
        "A weakened conditioned response returns after a rest",
        "Spontaneous recovery",
      ],
      [
        "Responding to cues resembling the learned cue",
        "Stimulus generalization",
      ],
      [
        "Learning to respond differently to distinct cues",
        "Stimulus discrimination",
      ],
    ]),
    ...unit("operant", "6-3-operant-conditioning", [
      [
        "Learning shaped by consequences of one’s actions",
        "Operant conditioning",
      ],
      [
        "Adding a consequence that increases a behavior",
        "Positive reinforcement",
      ],
      [
        "Removing a consequence that increases a behavior",
        "Negative reinforcement",
        "Negative means removal; reinforcement means an increase in behavior. It is different from punishment.",
      ],
      ["Adding a consequence that decreases a behavior", "Positive punishment"],
      [
        "Removing a consequence that decreases a behavior",
        "Negative punishment",
      ],
      ["Reinforcing successive steps toward a target behavior", "Shaping"],
      [
        "Reinforcing every occurrence of a target response",
        "Continuous reinforcement",
      ],
      ["Reward after a constant number of responses", "Fixed-ratio schedule"],
      [
        "Reward after a changing number of responses",
        "Variable-ratio schedule",
      ],
      [
        "Rewarding the first response after a constant time period",
        "Fixed-interval schedule",
      ],
      [
        "Rewarding the first response after varying time periods",
        "Variable-interval schedule",
      ],
      [
        "Rewarding only some occurrences of a target response",
        "Partial reinforcement",
      ],
    ]),
  ],
  perception: [
    ...unit("sensation", "5-1-sensation-versus-perception", [
      [
        "Sensory receptors detect stimulation from the environment",
        "Sensation",
      ],
      ["Organizing and interpreting sensory input", "Perception"],
      ["Sensory energy is converted into neural signals", "Transduction"],
      [
        "Minimum stimulus intensity detected on half of trials",
        "Absolute threshold",
      ],
      ["Smallest detectable change between stimuli", "Difference threshold"],
      [
        "A detectable difference scales with the original intensity",
        "Weber’s law",
      ],
      [
        "Incoming sensory features drive interpretation",
        "Bottom-up processing",
      ],
      [
        "Prior knowledge and expectations guide interpretation",
        "Top-down processing",
      ],
      [
        "Reduced sensitivity to ongoing, constant stimulation",
        "Sensory adaptation",
      ],
      [
        "Missing a visible object while attending elsewhere",
        "Inattentional blindness",
      ],
      ["Body-position information from muscles and joints", "Proprioception"],
      ["Sensory information about balance and head motion", "Vestibular sense"],
    ]),
    ...unit("vision", "5-3-vision", [
      ["Photoreceptors especially useful in dim light", "Rods"],
      ["Photoreceptors that support color vision and fine detail", "Cones"],
      ["Light-sensitive tissue lining the back of the eye", "Retina"],
      ["Central retinal region densely packed with cones", "Fovea"],
      ["Opening that lets light enter the eye", "Pupil"],
      ["Colored eye structure that controls pupil size", "Iris"],
      ["Transparent outer eye surface that helps focus light", "Cornea"],
      ["Adjustable transparent structure that focuses light", "Lens"],
      [
        "Retinal ganglion axons carry signals toward the brain through this",
        "Optic nerve",
      ],
      [
        "The optic nerve exit has no photoreceptors, producing this",
        "Blind spot",
      ],
    ]),
    ...unit("gestalt", "5-6-gestalt-principles-of-perception", [
      ["Grouping nearby visual elements together", "Proximity"],
      ["Grouping elements that look alike", "Similarity"],
      ["Perceiving a whole object despite missing boundaries", "Closure"],
      ["Preferring smoothly continuing contours", "Good continuation"],
      [
        "Separating a focal object from its surroundings",
        "Figure-ground organization",
      ],
      [
        "Expectations predispose us toward one interpretation",
        "Perceptual set",
      ],
    ]),
  ],
  research: [
    ...unit("research-methods", "2-2-approaches-to-research", [
      [
        "An intensive investigation of one person or a small group",
        "Case study",
      ],
      [
        "Observing behavior in its usual environment",
        "Naturalistic observation",
      ],
      ["Collecting self-reports with a set of questions", "Survey"],
      ["Examining records collected in the past", "Archival research"],
      [
        "Studying the same people repeatedly over time",
        "Longitudinal research",
      ],
      [
        "Comparing different age groups at one time",
        "Cross-sectional research",
      ],
      ["The entire group a researcher wants to understand", "Population"],
      ["A subset of the population that is studied", "Sample"],
      ["Consistent results across repeated measurements", "Reliability"],
      ["How well a measure captures the intended concept", "Validity"],
    ]),
    ...unit("research-design", "2-3-analyzing-findings", [
      ["A statement that can be tested with observations", "Hypothesis"],
      [
        "Specifying exactly how a variable is measured or changed",
        "Operational definition",
      ],
      [
        "A variable deliberately changed by the experimenter",
        "Independent variable",
      ],
      ["The outcome measured in an experiment", "Dependent variable"],
      ["Assigning participants to conditions by chance", "Random assignment"],
      ["Selecting members from a population by chance", "Random sampling"],
      [
        "A comparison condition without the experimental treatment",
        "Control group",
      ],
      ["A treatment-like intervention lacking its active component", "Placebo"],
      [
        "Neither participants nor relevant researchers know assignments",
        "Double-blind procedure",
      ],
      [
        "An uncontrolled factor that varies with the intended cause",
        "Confounding variable",
      ],
      ["Repeating a study to check whether its result recurs", "Replication"],
      ["Evaluating research through other specialists", "Peer review"],
    ]),
    ...unit("research-ethics", "2-4-ethics", [
      [
        "Agreeing to research after learning its relevant conditions",
        "Informed consent",
      ],
      ["Explaining the study to participants after it ends", "Debriefing"],
      [
        "A committee reviewing research with human participants",
        "Institutional review board",
      ],
      ["A committee reviewing research involving animals", "IACUC"],
      ["Withholding or misrepresenting aspects of a study", "Deception"],
      [
        "A person’s choice to join research without coercion",
        "Voluntary participation",
      ],
    ]),
  ],
  reasoning: unit("reasoning", "7-3-problem-solving", [
    ["A precisely specified series of steps for a solution", "Algorithm"],
    ["A practical shortcut that need not always succeed", "Heuristic"],
    ["Trying possible solutions until one works", "Trial and error"],
    [
      "Starting with a goal and reasoning back toward the present",
      "Working backwards",
    ],
    ["Persisting with a familiar strategy despite its failure", "Mental set"],
    [
      "Difficulty seeing an object outside its usual use",
      "Functional fixedness",
    ],
    [
      "Favoring information that supports an existing belief",
      "Confirmation bias",
    ],
    ["Letting an initial reference value sway a judgment", "Anchoring bias"],
    [
      "Treating an outcome as more predictable after it happens",
      "Hindsight bias",
    ],
    [
      "Judging likelihood by examples that easily come to mind",
      "Availability heuristic",
    ],
    [
      "Judging category membership by similarity to a stereotype",
      "Representativeness heuristic",
    ],
  ]),
  social: unit("group-processes", "12-4-conformity-compliance-and-obedience", [
    ["Changing behavior to align with a group", "Conformity"],
    ["Following an instruction from an authority", "Obedience"],
    [
      "Conforming to be accepted or avoid social rejection",
      "Normative social influence",
    ],
    [
      "Conforming because others are believed to be better informed",
      "Informational social influence",
    ],
    ["Group harmony overrides critical evaluation of decisions", "Groupthink"],
    [
      "Discussion shifts a group toward a more extreme initial tendency",
      "Group polarization",
    ],
    [
      "An audience improves performance on well-practiced simple tasks",
      "Social facilitation",
    ],
    [
      "Exerting less effort when individual contributions are obscured",
      "Social loafing",
    ],
  ]),
  statistics: unit("correlation", "2-3-analyzing-findings", [
    ["A statistical relationship between measured variables", "Correlation"],
    ["Variables tend to increase together", "Positive correlation"],
    [
      "One variable tends to increase while the other decreases",
      "Negative correlation",
    ],
    [
      "A number describing strength and direction of a linear relationship",
      "Correlation coefficient",
    ],
    ["A graph displaying pairs of values for two variables", "Scatterplot"],
    [
      "One factor actually brings about a change in another",
      "Causation",
      "An association alone does not establish a cause. Experimental design and alternative explanations matter.",
    ],
  ]),
};
