const VAGUE_IMAGE_REQUEST_PATTERNS = [
  /^(?:generate|create|make|draw|design|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?(?:image|picture|photo|illustration|graphic|visual|diagram|something)\s*\.?$/i,
  /^(?:draw|sketch|paint)(?:\s+me)?\s+(?:something|anything)\s*\.?$/i,
];

const VAGUE_IMAGE_EDIT_PATTERNS = [
  /^(?:edit|update|change|modify|improve|enhance)(?:\s+(?:it|this|this image|the image|image|picture))?\s*\.?$/i,
  /^(?:make it|make this)(?:\s+(?:better|different))?\s*\.?$/i,
];

const IMAGE_CLARIFICATION_PROMPTS = new Set([
  "what image would you like me to generate?",
  "what should it show?",
]);

const IMAGE_GENERATION_PATTERNS = [
  /^(?:generate|create|make|draw|design|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?(?:image|picture|photo|illustration|graphic|visual|diagram|something)\s*\.?$/i,
  /^(?:generate|create|make|draw|design|illustrate|render)\s+(?:me\s+)?(?:the\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|graphic|visual)\s+(?:of|for)?\s*(.+)$/i,
  /^(?:generate|create|make|design)\s+(?:me\s+)?(?:a|an)\s+(logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\b.*$/i,
  /^(?:generate|create|make|draw|design|illustrate|render|show me)\s+(?:me\s+)?(?:an?\s+)?(?:map|diagram|chart|poster|banner|flyer|infographic|logo)\s*(?:of|for)?\b.*$/i,
  /^(?:draw|sketch|paint)\s+(?:me\s+)?(?:an?\s+)?(?!conclusions?\b|a\s+conclusion\b).{2,}$/i,
  /^(?:draw|show me|create|make)\s+.+\b(?:diagram|map|poster|chart|illustration)\b.*$/i,
  /^(?:logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\s*:\s*(.+)$/i,
];

const IMAGE_EDIT_FOLLOW_UP_PATTERNS = [
  /^(?:make it|make this|make the image|make the diagram)\s+.+$/i,
  /^(?:add|remove|use|change|replace|simplify)\s+.+$/i,
  /\b(?:add labels|add arrows|make it simpler|make it realistic|make it exam-style|use white background|remove the background|make it cleaner|simplify the diagram)\b/i,
  /\b(?:simpler|realistic|exam-style|white background|remove background|add labels|add arrows|cleaner)\b/i,
];

const BIOLOGY_DIAGRAM_PATTERN =
  /\b(?:biology|plant cell|animal cell|cell|heart|nephron|digestive system|life cycle|anatomy|organelle|chloroplast|xylem|phloem|atrium|ventricle)\b/i;
const PHYSICS_DIAGRAM_PATTERN =
  /\b(?:physics|force|motion|ray|mirror|lens|circuit|battery|resistor|current|voltage|vector|reflection|refraction)\b/i;
const CHEMISTRY_DIAGRAM_PATTERN =
  /\b(?:chemistry|atom|bonding|apparatus|distillation|filtration|water purification|reaction|molecule|electron shell|beaker|flask|condenser)\b/i;

const DIAGRAM_TYPE_PATTERNS = [
  ["plant_cell", /\bplant cell\b/i],
  ["animal_cell", /\banimal cell\b/i],
  ["heart_diagram", /\bheart\b/i],
  ["nephron", /\bnephron\b/i],
  ["digestive_system", /\bdigestive system\b/i],
  ["life_cycle", /\blife cycle\b/i],
  ["force_diagram", /\bforce diagram\b|\bforce\b/i],
  ["motion_diagram", /\bmotion diagram\b|\bmotion sketch\b/i],
  ["ray_diagram", /\bray diagram\b|\breflection\b|\brefraction\b/i],
  ["circuit_diagram", /\bcircuit diagram\b|\bcircuit\b/i],
  ["vector_diagram", /\bvector diagram\b|\bvector\b/i],
  ["water_purification", /\bwater purification\b/i],
  ["distillation_setup", /\bdistillation\b/i],
  ["apparatus_setup", /\bapparatus\b|\bsetup\b/i],
  ["atom_structure", /\batom\b|\batomic\b/i],
  ["bonding_diagram", /\bbonding\b/i],
  ["reaction_process", /\breaction\b|\bprocess\b/i],
  ["process_diagram", /\bprocess\b|\bflow(?:chart)?\b|\bcycle\b/i],
  ["coordinate_diagram", /\bcoordinate\b/i],
  ["graph_sketch", /\bgraph\b|\bplot\b|\bcurve\b/i],
  ["geometry_sketch", /\btriangle\b|\bgeometry\b|\bshape\b/i],
];

export function isImageGenerationPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return IMAGE_GENERATION_PATTERNS.some((pattern) => pattern.test(value));
}

export function getVagueImageRequestClarification(text) {
  const value = String(text || "").trim();
  if (!value || !isImageGenerationPrompt(value)) return "";
  if (!VAGUE_IMAGE_REQUEST_PATTERNS.some((pattern) => pattern.test(value))) return "";
  if (/\b(?:logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper|map|diagram|chart|infographic)\b/i.test(value)) {
    return "What should it show?";
  }
  return "What image would you like me to generate?";
}

export function getVagueImageEditClarification(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (!VAGUE_IMAGE_EDIT_PATTERNS.some((pattern) => pattern.test(value))) return "";
  return "What would you like me to change in the image?";
}

export function isImageClarificationQuestion(text) {
  const value = String(text || "").trim().toLowerCase();
  return IMAGE_CLARIFICATION_PROMPTS.has(value);
}

export function isImageEditFollowUpPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (isImageGenerationPrompt(value)) return false;
  return IMAGE_EDIT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(value));
}

export function isDiagramGenerationPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return /\b(diagram|sketch|labeled|labelled|process|flow(?:chart)?|cycle|circuit|structure|concept map|graph|plot|curve|triangle|vector|coordinate|geometry|shape)\b/i.test(value);
}

export function detectDiagramSubject(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (BIOLOGY_DIAGRAM_PATTERN.test(value)) return "biology";
  if (PHYSICS_DIAGRAM_PATTERN.test(value)) return "physics";
  if (CHEMISTRY_DIAGRAM_PATTERN.test(value)) return "chemistry";
  return "";
}

export function detectDiagramType(text, subject = "") {
  const value = String(text || "").trim();
  if (!value) return "";

  const preferredPrefixes = {
    biology: ["plant_cell", "animal_cell", "heart_diagram", "nephron", "digestive_system", "life_cycle"],
    physics: ["force_diagram", "motion_diagram", "ray_diagram", "circuit_diagram", "vector_diagram"],
    chemistry: ["water_purification", "distillation_setup", "apparatus_setup", "atom_structure", "bonding_diagram", "reaction_process"],
  };

  const preferred = new Set(preferredPrefixes[String(subject || "").toLowerCase()] || []);
  for (const [diagramType, pattern] of DIAGRAM_TYPE_PATTERNS) {
    if (preferred.has(diagramType) && pattern.test(value)) return diagramType;
  }
  for (const [diagramType, pattern] of DIAGRAM_TYPE_PATTERNS) {
    if (pattern.test(value)) return diagramType;
  }
  return "";
}

export function getGeneratedImagePresentation(text) {
  const value = String(text || "").trim();
  if (!value || !isDiagramGenerationPrompt(value)) {
    return {
      imageVariant: "image",
      diagramLabel: "",
      diagramSubject: "",
      diagramType: "",
    };
  }

  const diagramSubject = detectDiagramSubject(value);
  const diagramType = detectDiagramType(value, diagramSubject);

  if (/\b(labeled|labelled)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Labeled Diagram",
      diagramSubject,
      diagramType,
    };
  }

  if (/\b(process|flow(?:chart)?|cycle|steps?)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Process Sketch",
      diagramSubject,
      diagramType,
    };
  }

  if (/\b(graph|plot|curve)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Coordinate Sketch",
      diagramSubject,
      diagramType,
    };
  }

  if (/\b(coordinate|vector)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Coordinate Sketch",
      diagramSubject,
      diagramType,
    };
  }

  if (/\b(triangle|geometry|shape)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Geometry Sketch",
      diagramSubject,
      diagramType,
    };
  }

  if (/\b(diagram|circuit|structure|concept map)\b/i.test(value)) {
    return {
      imageVariant: "diagram",
      diagramLabel: "Concept Diagram",
      diagramSubject,
      diagramType,
    };
  }

  return {
    imageVariant: "diagram",
    diagramLabel: "AI Sketch",
    diagramSubject,
    diagramType,
  };
}
