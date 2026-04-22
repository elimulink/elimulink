import {
  detectDiagramSubject,
  detectDiagramType,
  getGeneratedImagePresentation,
  isImageEditFollowUpPrompt,
} from "../image-generation/imageGenerationIntent.js";
import { getImageSearchQuery } from "../image-search/searchWebImages.js";

const VISUAL_EXPLICIT_ALLOW_REPEAT_PATTERN =
  /\b(?:again|another|different|compare|alongside|side by side|show more|more examples|more images|more photos)\b/i;
const SHORT_FOLLOW_UP_ONLY_PATTERN =
  /^(?:yes|yeah|yep|ok|okay|continue|go on|show more|more|next|another one|another|again)\b[.!?]*$/i;
const EXPLICIT_REAL_IMAGE_REQUEST_PATTERN =
  /\b(?:show|find|get|browse|search|give me|need)\b[\s\S]*\b(?:images?|pictures?|photos?|what (?:it|this|they) looks? like|what does .* look like)\b/i;
const REAL_IMAGE_INTENT_PATTERN =
  /\b(?:show|find|get|browse|search|give me|need)\b[\s\S]*\b(?:images?|pictures?|photos?|examples?|what this looks like|what does .* look like|real|reference|web)\b/i;
const EXPLICIT_BOTH_REQUEST_PATTERN =
  /\b(?:both|real images? and|real photos? and|pictures? and|images? and)\b[\s\S]*\b(?:diagram|sketch|illustrat|labeled|labelled|process|flow|circuit|ray|graph)\b/i;
const SHOW_AND_DIAGRAM_PATTERN =
  /^(?:show|find|get|browse)\s+(?:me\s+)?(.+?)\s+and\s+(?:a|an|the)?\s*(?:labeled|labelled|process|flow|force|circuit|ray|concept)?\s*(?:diagram|sketch|illustration)\b/i;
const GRAPH_REQUEST_PATTERN =
  /\b(?:graph|plot|sketch(?:\s+this)?\s+curve|curve sketch|draw triangle|triangle\b|vector\b|coordinate diagram|coordinate plane|axes)\b/i;
const DIAGRAM_REQUEST_PATTERN =
  /\b(?:draw|diagram|sketch|illustrate|labeled|labelled|show process|process diagram|flow diagram|force diagram|circuit diagram|ray diagram|motion diagram|motion sketch|vector diagram)\b/i;
const REAL_WORLD_IMAGE_SUBJECT_PATTERN =
  /\b(?:heart|organ|animal|bird|campus|lab equipment|equipment|apparatus|microscope|beaker|flask|human body|skeleton|plant|leaf|flower)\b/i;
const NON_PHYSICAL_CONCEPT_PATTERN =
  /\b(?:osmosis|inertia|climate change|democracy|gravity|photosynthesis|equilibrium|theory|definition|concept)\b/i;
const BIOLOGY_REAL_IMAGE_PATTERN = /\b(?:heart|organ|animal|leaf|flower|skeleton|organism)\b/i;
const BIOLOGY_DIAGRAM_PATTERN = /\b(?:cell|plant cell|animal cell|nephron|life cycle|digestive system|anatomy|system)\b/i;
const PHYSICS_REAL_IMAGE_PATTERN = /\b(?:equipment|apparatus|motor|battery|bulb|lens|mirror)\b/i;
const PHYSICS_DIAGRAM_PATTERN = /\b(?:force|circuit|ray|vector|motion|reflection|refraction)\b/i;
const CHEMISTRY_REAL_IMAGE_PATTERN = /\b(?:lab equipment|apparatus|beaker|flask|condenser|distillation setup)\b/i;
const CHEMISTRY_DIAGRAM_PATTERN = /\b(?:process|atom|bonding|reaction|distillation|water purification|setup)\b/i;
const MATH_GRAPH_PATTERN = /\b(?:graph|plot|curve|triangle|vector|coordinate|axes|geometry)\b/i;
const DIAGRAM_STRUCTURE_PATTERN = /\b(?:process|flow|cycle|structure|setup|system|labeled|labelled)\b/i;
const VISUAL_ACTION_PATTERN = /\b(?:draw|diagram|sketch|illustrate|render|create|make|generate|plot|graph|show)\b/i;
const DEFINITION_STYLE_PATTERN =
  /^(?:what is|define|explain|tell me about|describe|give me a definition of)\b/i;
const CASUAL_TEXT_PATTERN = /^(?:hi|hello|hey|thanks|thank you|ok|okay)\b/i;
const EXPLICIT_DIAGRAM_REQUEST_PATTERN =
  /\b(?:draw|diagram|sketch|illustrate|labeled|labelled)\b/i;
const EXPLICIT_PROCESS_DIAGRAM_PATTERN =
  /\b(?:process|flow|cycle|structure|setup|system)\b/i;
const EXPLICIT_REAL_IMAGE_REFERENCE_PATTERN = /\b(?:real|reference|web)\b/i;
const EXPLICIT_LOOKS_LIKE_PATTERN = /\bwhat (?:it|this|they) looks? like\b|\bwhat does .* look like\b/i;
const EQUIPMENT_IMAGE_PATTERN = /\b(?:equipment|apparatus|microscope|beaker|flask|condenser|lab equipment)\b/i;
const ORGAN_APPEARANCE_PATTERN = /\b(?:heart|organ|animal|bird|skeleton|leaf|flower|plant|human body)\b/i;
const BIOLOGY_STRUCTURE_PATTERN = /\b(?:cell|plant cell|animal cell|nephron|life cycle|digestive system|anatomy|organelle|system)\b/i;
const PHYSICS_DIAGRAM_ONLY_PATTERN = /\b(?:force|circuit|ray|vector|motion|reflection|refraction)\b/i;
const CHEMISTRY_DIAGRAM_ONLY_PATTERN = /\b(?:process|atom|bonding|reaction|distillation|water purification|setup|structure)\b/i;
const MATH_VISUAL_PATTERN = /\b(?:draw|sketch|plot|graph|triangle|vector|geometry|coordinate|axes|curve)\b/i;

function cleanVisualSubject(value) {
  return String(value || "")
    .replace(/\b(?:please|can you|could you)\b/gi, "")
    .replace(/\b(?:show|find|get|browse|search|give me|need|draw|sketch|diagram|illustrate|render|create|make|generate|explain visually)\b/gi, "")
    .replace(/\b(?:real|reference|web|images?|pictures?|photos?|examples?|diagram|sketch|illustration|labeled|labelled|process|flow|setup)\b/gi, "")
    .replace(/\bmore\b/gi, "")
    .replace(/\b(?:of|for|about)\b/gi, " ")
    .replace(/\s+and\s+(?:a|an|the)?\s*$/i, "")
    .replace(/\band\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createTextDecision() {
  return {
    mode: "text",
    shouldSearchWebImages: false,
    shouldGenerateDiagram: false,
    webQuery: "",
    diagramPrompt: "",
    imageVariant: "image",
    diagramLabel: "",
    diagramSubject: "",
    diagramType: "",
  };
}

function isMathGraphVisualRequest(value) {
  return GRAPH_REQUEST_PATTERN.test(value) && MATH_GRAPH_PATTERN.test(value);
}

function isDefinitionLikePrompt(value) {
  return DEFINITION_STYLE_PATTERN.test(value) || CASUAL_TEXT_PATTERN.test(value);
}

function isShortVisualFollowUp(value) {
  return SHORT_FOLLOW_UP_ONLY_PATTERN.test(String(value || "").trim());
}

function resolveSubjectVisualBias(value, subject) {
  switch (subject) {
    case "biology":
      return {
        prefersRealImages: BIOLOGY_REAL_IMAGE_PATTERN.test(value),
        prefersDiagram: BIOLOGY_DIAGRAM_PATTERN.test(value),
      };
    case "physics":
      return {
        prefersRealImages: PHYSICS_REAL_IMAGE_PATTERN.test(value),
        prefersDiagram: PHYSICS_DIAGRAM_PATTERN.test(value),
      };
    case "chemistry":
      return {
        prefersRealImages: CHEMISTRY_REAL_IMAGE_PATTERN.test(value),
        prefersDiagram: CHEMISTRY_DIAGRAM_PATTERN.test(value),
      };
    default:
      return {
        prefersRealImages: REAL_WORLD_IMAGE_SUBJECT_PATTERN.test(value),
        prefersDiagram: false,
      };
  }
}

function shouldSuppressRepeatedVisual({
  requestedMode,
  requestedQuery,
  requestedDiagramType,
  requestedDiagramSubject,
  previousVisualMode,
  previousWebQuery,
  previousDiagramType,
  previousDiagramSubject,
  prompt,
}) {
  if (!requestedMode || requestedMode === "text") return false;
  if (!previousVisualMode || previousVisualMode === "text") return false;
  if (VISUAL_EXPLICIT_ALLOW_REPEAT_PATTERN.test(prompt)) return false;
  if (requestedMode !== previousVisualMode) return false;

  const requestedTopic = cleanVisualSubject(requestedQuery || prompt);
  const previousTopic = cleanVisualSubject(previousWebQuery || "");

  if (requestedMode === "web_images") {
    return Boolean(requestedTopic && previousTopic && requestedTopic === previousTopic);
  }

  if (requestedMode === "diagram") {
    return (
      Boolean(requestedDiagramType && previousDiagramType && requestedDiagramType === previousDiagramType) ||
      Boolean(requestedDiagramSubject && previousDiagramSubject && requestedDiagramSubject === previousDiagramSubject && requestedTopic === previousTopic)
    );
  }

  if (requestedMode === "both") {
    return (
      Boolean(requestedDiagramType && previousDiagramType && requestedDiagramType === previousDiagramType) &&
      Boolean(requestedTopic && previousTopic && requestedTopic === previousTopic)
    );
  }

  return false;
}

export function resolveVisualIntent(
  text,
  {
    hasAttachments = false,
    shouldEditImage = false,
    previousVisualMode = "",
    previousWebQuery = "",
    previousDiagramType = "",
    previousDiagramSubject = "",
  } = {}
) {
  const value = String(text || "").trim();
  if (!value || hasAttachments || shouldEditImage || isImageEditFollowUpPrompt(value)) {
    return createTextDecision();
  }

  const lowered = value.toLowerCase();
  const showAndDiagramMatch = value.match(SHOW_AND_DIAGRAM_PATTERN);
  const webQuery = getImageSearchQuery(value, {
    hasAttachments,
    shouldGenerateImage: false,
    shouldEditImage,
  });
  const diagramPresentation = getGeneratedImagePresentation(value);
  const diagramSubject = diagramPresentation.diagramSubject || detectDiagramSubject(value);
  const diagramType = diagramPresentation.diagramType || detectDiagramType(value, diagramSubject);
  const subjectBias = resolveSubjectVisualBias(value, diagramSubject);

  if (isDefinitionLikePrompt(value) && !REAL_IMAGE_INTENT_PATTERN.test(value) && !DIAGRAM_REQUEST_PATTERN.test(value) && !GRAPH_REQUEST_PATTERN.test(value)) {
    return createTextDecision();
  }
  if (isShortVisualFollowUp(value) && !VISUAL_EXPLICIT_ALLOW_REPEAT_PATTERN.test(value)) {
    return createTextDecision();
  }

  const explicitRealImages =
    EXPLICIT_REAL_IMAGE_REQUEST_PATTERN.test(value) ||
    (EXPLICIT_LOOKS_LIKE_PATTERN.test(value) && /\b(?:show|find|get|browse|search|give me)\b/i.test(value)) ||
    (EXPLICIT_REAL_IMAGE_REFERENCE_PATTERN.test(value) && REAL_IMAGE_INTENT_PATTERN.test(value));
  const explicitDiagram =
    EXPLICIT_DIAGRAM_REQUEST_PATTERN.test(value) ||
    (EXPLICIT_PROCESS_DIAGRAM_PATTERN.test(value) && /\b(?:draw|show|illustrate|sketch)\b/i.test(value)) ||
    isMathGraphVisualRequest(value);
  const explicitBoth =
    Boolean(showAndDiagramMatch?.[1]) ||
    EXPLICIT_BOTH_REQUEST_PATTERN.test(value) ||
    (explicitRealImages && explicitDiagram && /\b(?:and|with|plus|alongside|together with)\b/i.test(value));

  const wantsGraph = isMathGraphVisualRequest(value);
  const biologyRealImages = subjectBias.prefersRealImages && !subjectBias.prefersDiagram && (ORGAN_APPEARANCE_PATTERN.test(value) || BIOLOGY_REAL_IMAGE_PATTERN.test(value));
  const chemistryRealImages = EQUIPMENT_IMAGE_PATTERN.test(value) && CHEMISTRY_REAL_IMAGE_PATTERN.test(value);
  const subjectSafeRealImages =
    !NON_PHYSICAL_CONCEPT_PATTERN.test(value) &&
    !explicitDiagram &&
    (
      biologyRealImages ||
      chemistryRealImages ||
      (diagramSubject === "physics" && PHYSICS_REAL_IMAGE_PATTERN.test(value)) ||
      (!diagramSubject && REAL_WORLD_IMAGE_SUBJECT_PATTERN.test(value) && !BIOLOGY_STRUCTURE_PATTERN.test(value))
    );
  const subjectSafeDiagram =
    !explicitRealImages &&
    (
      (diagramSubject === "biology" && BIOLOGY_STRUCTURE_PATTERN.test(value) && (VISUAL_ACTION_PATTERN.test(value) || DIAGRAM_STRUCTURE_PATTERN.test(value))) ||
      (diagramSubject === "physics" && PHYSICS_DIAGRAM_ONLY_PATTERN.test(value)) ||
      (diagramSubject === "chemistry" && CHEMISTRY_DIAGRAM_ONLY_PATTERN.test(value)) ||
      (diagramSubject === "math" && MATH_VISUAL_PATTERN.test(value))
    );
  const wantsDiagram =
    explicitDiagram ||
    (!explicitBoth &&
      (
        (DIAGRAM_STRUCTURE_PATTERN.test(value) && /\b(?:show|illustrate|draw|sketch)\b/i.test(value)) ||
        subjectSafeDiagram
      ));
  const wantsRealImages =
    !NON_PHYSICAL_CONCEPT_PATTERN.test(value) &&
    (
      explicitRealImages ||
      (Boolean(webQuery) && !explicitDiagram) ||
      subjectSafeRealImages
    );

  let decision = createTextDecision();

  if (explicitBoth && wantsRealImages && wantsDiagram) {
    decision = {
      mode: "both",
      shouldSearchWebImages: true,
      shouldGenerateDiagram: true,
      webQuery: cleanVisualSubject(webQuery || showAndDiagramMatch?.[1] || value),
      diagramPrompt: value,
      imageVariant: "diagram",
      diagramLabel: diagramPresentation.diagramLabel || (wantsGraph ? "Coordinate Sketch" : "AI Sketch"),
      diagramSubject: diagramSubject || (wantsGraph ? "math" : ""),
      diagramType: diagramType || (wantsGraph ? "graph_sketch" : ""),
    };
  } else if (wantsDiagram) {
    decision = {
      mode: "diagram",
      shouldSearchWebImages: false,
      shouldGenerateDiagram: true,
      webQuery: "",
      diagramPrompt: value,
      imageVariant: "diagram",
      diagramLabel: diagramPresentation.diagramLabel || (wantsGraph ? "Coordinate Sketch" : "AI Sketch"),
      diagramSubject: diagramSubject || (wantsGraph ? "math" : ""),
      diagramType: diagramType || (wantsGraph ? "graph_sketch" : ""),
    };
  } else if (wantsRealImages) {
    decision = {
      mode: "web_images",
      shouldSearchWebImages: true,
      shouldGenerateDiagram: false,
      webQuery: cleanVisualSubject(webQuery || lowered),
      diagramPrompt: "",
      imageVariant: "image",
      diagramLabel: "",
      diagramSubject: "",
      diagramType: "",
    };
  }

  if (
    shouldSuppressRepeatedVisual({
      requestedMode: decision.mode,
      requestedQuery: decision.webQuery,
      requestedDiagramType: decision.diagramType,
      requestedDiagramSubject: decision.diagramSubject,
      previousVisualMode,
      previousWebQuery,
      previousDiagramType,
      previousDiagramSubject,
      prompt: value,
    })
  ) {
    return createTextDecision();
  }

  return decision;
}
