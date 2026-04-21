import { searchWebImages } from "../image-search/searchWebImages.js";
import {
  getVagueImageEditClarification,
  getVagueImageRequestClarification,
  isImageEditFollowUpPrompt,
} from "../image-generation/imageGenerationIntent.js";
import { shouldOfferImageComparison } from "../image-generation/imageComparisonIntent.js";
import { resolveVisualIntent } from "../visual-intent/visualIntentRouting.js";
import { normalizeResearchSources } from "../research/researchUtils.js";

function findPreviousAssistantVisual(messages) {
  return [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find((message) => message?.role === "assistant" && (message?.imageUrl || (Array.isArray(message?.imageSearchResults) && message.imageSearchResults.length)));
}

function getPreviousVisualMode(message) {
  if (!message) return "";
  if (Array.isArray(message?.imageSearchResults) && message.imageSearchResults.length) {
    return message?.imageUrl ? "both" : "web_images";
  }
  if (message?.imageVariant === "diagram") {
    return "diagram";
  }
  return "";
}

function buildTextVisualIntent() {
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

function decorateAssistantMessage(payload, createAssistantMessage) {
  const basePayload = { role: "assistant", ...payload };
  return typeof createAssistantMessage === "function"
    ? createAssistantMessage(basePayload)
    : basePayload;
}

function createImagePresentation(visualIntent) {
  return {
    imageVariant: visualIntent.imageVariant,
    diagramLabel: visualIntent.diagramLabel,
    diagramSubject: visualIntent.diagramSubject,
    diagramType: visualIntent.diagramType,
  };
}

function defaultCombinedVisualText({ webQuery, results, imageUrl }) {
  if (results.length && imageUrl) {
    return `Here are real web images for "${webQuery}" plus an AI instructional diagram.`;
  }
  if (imageUrl) {
    return "I prepared an AI instructional diagram, but I could not find matching real web images right now.";
  }
  if (results.length) {
    return `Here are real web images for "${webQuery}". I could not generate the diagram right now.`;
  }
  return "I could not prepare the requested visuals right now.";
}

function defaultWebSearchText({ query, results }) {
  return results.length
    ? `Here are image results for "${query}".`
    : `I couldn't find image results for "${query}" right now.`;
}

export function buildVisualActionPlan({
  requestText,
  messages,
  pendingAttachmentCount = 0,
  shouldEditImage = false,
  disableVisualRouting = false,
  imageAPI,
} = {}) {
  const previousAssistantVisual = findPreviousAssistantVisual(messages);
  const visualIntent = disableVisualRouting
    ? buildTextVisualIntent()
    : resolveVisualIntent(requestText, {
        hasAttachments: pendingAttachmentCount > 0,
        shouldEditImage,
        previousVisualMode: getPreviousVisualMode(previousAssistantVisual),
        previousWebQuery: previousAssistantVisual?.imageSearchQuery || "",
        previousDiagramType: previousAssistantVisual?.diagramType || "",
        previousDiagramSubject: previousAssistantVisual?.diagramSubject || "",
      });

  const shouldGenerateImage = visualIntent.mode === "diagram";
  const shouldGenerateBothVisuals = visualIntent.mode === "both";
  const imageGenerationClarification = shouldGenerateImage || shouldGenerateBothVisuals
    ? getVagueImageRequestClarification(requestText)
    : "";
  const shouldEditLatestImage =
    pendingAttachmentCount === 0 &&
    visualIntent.mode === "text" &&
    (isImageEditFollowUpPrompt(requestText) || Boolean(getVagueImageEditClarification(requestText)));
  const imageEditClarification = shouldEditLatestImage
    ? getVagueImageEditClarification(requestText)
    : "";
  const latestImageUrl = shouldEditLatestImage && imageAPI
    ? imageAPI.getLatestImageFromMessages(messages)
    : "";
  const imageSearchQuery = shouldEditLatestImage ? "" : visualIntent.webQuery;

  return {
    visualIntent,
    shouldGenerateImage,
    shouldGenerateBothVisuals,
    imageGenerationClarification,
    shouldEditLatestImage,
    imageEditClarification,
    latestImageUrl,
    imageSearchQuery,
  };
}

export async function runVisualActionPlan({
  plan,
  requestText,
  clean,
  messages,
  idToken,
  imageAPI,
  updateMessages,
  createAssistantMessage,
  labels = {},
  copy = {},
  onStatusMessageAdded,
} = {}) {
  if (!plan || typeof updateMessages !== "function" || !imageAPI) return false;

  const titleFor = (key, fallback) => clean || labels[key] || fallback;
  const imageUnavailableText = copy.imageUnavailableText || "Image generation is unavailable right now.";
  const combinedUnavailableText = copy.combinedUnavailableText || "I could not prepare the requested visuals right now.";
  const webSearchUnavailableText = copy.webSearchUnavailableText || "Web image search is unavailable right now.";
  const editImageUnavailableText = copy.editImageUnavailableText || "Image editing is unavailable right now.";
  const missingImageToEditText = copy.missingImageToEditText || "Please generate or upload an image first, then tell me how you want it edited.";
  const editedImageSuccessText = copy.editedImageSuccessText || "Updated ✅";
  const imageResultText = copy.imageResultText || ((result) => result?.text || "Here is your generated image.");
  const combinedVisualText = copy.combinedVisualText || defaultCombinedVisualText;
  const webSearchText = copy.webSearchText || defaultWebSearchText;

  if (plan.shouldGenerateImage) {
    if (plan.imageGenerationClarification) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage({ text: plan.imageGenerationClarification }, createAssistantMessage),
        ],
        titleFor("generateImage", "Image generation")
      );
      return true;
    }

    try {
      const shouldCompareImage = shouldOfferImageComparison(requestText, {
        isNewChat: messages.length <= 1,
        hasExistingDirection: Boolean(imageAPI.getLatestImageFromMessages(messages)),
        hasShownComparison: messages.some(
          (message) => Boolean(message?.comparison) || (Array.isArray(message?.imageOptions) && message.imageOptions.length >= 2)
        ),
      });
      const imageResult = await imageAPI.generateImage(requestText, {
        idToken,
        compare: shouldCompareImage,
      });
      const imagePresentation = createImagePresentation(plan.visualIntent);

      if (Array.isArray(imageResult.images) && imageResult.images.length >= 2) {
        updateMessages(
          (nextMessages) => [
            ...nextMessages,
            decorateAssistantMessage(
              {
                id: Date.now(),
                text: "",
                type: "image-comparison",
                comparison: true,
                comparisonTitle: imageResult.text || "Which image do you like more?",
                comparisonSelectedIndex: null,
                selectedImageIndex: null,
                selectedImageUrl: "",
                imageUrl: "",
                ...imagePresentation,
                imageOptions: imageResult.images.map((item, index) => ({
                  index: index + 1,
                  image: item.image,
                  model: item.model || "",
                })),
              },
              createAssistantMessage
            ),
          ],
          titleFor("generateImage", "Image generation")
        );
        return true;
      }

      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage(
            {
              text: imageResultText(imageResult),
              imageUrl: imageResult.image,
              ...imagePresentation,
              type: "image",
            },
            createAssistantMessage
          ),
        ],
        titleFor("generateImage", "Image generation")
      );
    } catch (error) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage(
            {
              text: String(error?.message || imageUnavailableText),
            },
            createAssistantMessage
          ),
        ],
        titleFor("generateImage", "Image generation")
      );
    }
    return true;
  }

  if (plan.shouldGenerateBothVisuals) {
    if (plan.imageGenerationClarification) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage({ text: plan.imageGenerationClarification }, createAssistantMessage),
        ],
        titleFor("both", "Visual explanation")
      );
      return true;
    }

    const visualStatusId = `visual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    updateMessages(
      (nextMessages) => [
        ...nextMessages,
        decorateAssistantMessage(
          {
            id: visualStatusId,
            text: `Preparing visuals...\nWeb images: ${plan.visualIntent.webQuery}\nDiagram: ${requestText}`,
          },
          createAssistantMessage
        ),
      ],
      titleFor("both", "Visual explanation")
    );
    if (typeof onStatusMessageAdded === "function") onStatusMessageAdded();

    try {
      const [webResult, diagramResult] = await Promise.allSettled([
        searchWebImages(plan.visualIntent.webQuery, { limit: 8 }),
        imageAPI.generateImage(plan.visualIntent.diagramPrompt || requestText, {
          idToken,
          compare: false,
        }),
      ]);
      const results = webResult.status === "fulfilled" ? webResult.value : [];
      const imageUrl = diagramResult.status === "fulfilled" ? String(diagramResult.value?.image || "").trim() : "";

      updateMessages(
        (nextMessages) => [
          ...nextMessages.map((message) =>
            String(message?.id || "") === visualStatusId
              ? {
                  ...message,
                  ...decorateAssistantMessage(
                    {
                      text: combinedVisualText({
                        webQuery: plan.visualIntent.webQuery,
                        results,
                        imageUrl,
                      }),
                      imageSearchResults: results,
                      imageSearchQuery: plan.visualIntent.webQuery,
                      imageUrl,
                      ...createImagePresentation(plan.visualIntent),
                      type: "image",
                      sources: normalizeResearchSources({ imageSearchResults: results }),
                    },
                    createAssistantMessage
                  ),
                  createdAt: message?.createdAt || Date.now(),
                }
              : message
          ),
        ],
        titleFor("both", "Visual explanation")
      );
    } catch (error) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages.map((message) =>
            String(message?.id || "") === visualStatusId
              ? {
                  ...message,
                  ...decorateAssistantMessage(
                    {
                      text: String(error?.message || combinedUnavailableText),
                    },
                    createAssistantMessage
                  ),
                  createdAt: message?.createdAt || Date.now(),
                }
              : message
          ),
        ],
        titleFor("both", "Visual explanation")
      );
    }
    return true;
  }

  if (plan.shouldEditLatestImage) {
    if (plan.imageEditClarification && plan.latestImageUrl) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage({ text: plan.imageEditClarification }, createAssistantMessage),
        ],
        titleFor("edit", "Image editing")
      );
      return true;
    }

    if (!plan.latestImageUrl) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage({ text: missingImageToEditText }, createAssistantMessage),
        ],
        titleFor("edit", "Image editing")
      );
      return true;
    }

    try {
      const result = await imageAPI.editImage({
        imageDataUrl: plan.latestImageUrl,
        prompt: clean || requestText,
      });
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage(
            {
              text: result.text || editedImageSuccessText,
              imageUrl: result.image,
              imageVariant: "image",
              diagramLabel: "",
              type: "image",
            },
            createAssistantMessage
          ),
        ],
        labels.edited || "Edited image"
      );
    } catch (error) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages,
          decorateAssistantMessage(
            {
              text: String(error?.message || editImageUnavailableText),
            },
            createAssistantMessage
          ),
        ],
        labels.edited || "Edited image"
      );
    }
    return true;
  }

  if (plan.imageSearchQuery) {
    const searchStatusId = `img-search-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    updateMessages(
      (nextMessages) => [
        ...nextMessages,
        decorateAssistantMessage(
          {
            id: searchStatusId,
            text: `Searching images...\nQuery: ${plan.imageSearchQuery}`,
          },
          createAssistantMessage
        ),
      ],
      titleFor("search", "Web image search")
    );
    if (typeof onStatusMessageAdded === "function") onStatusMessageAdded();

    try {
      const results = await searchWebImages(plan.imageSearchQuery, { limit: 8 });
      updateMessages(
        (nextMessages) => [
          ...nextMessages.map((message) =>
            String(message?.id || "") === searchStatusId
              ? {
                  ...message,
                  ...decorateAssistantMessage(
                    {
                      id: searchStatusId,
                      text: webSearchText({ query: plan.imageSearchQuery, results }),
                      imageSearchResults: results,
                      imageSearchQuery: plan.imageSearchQuery,
                      sources: normalizeResearchSources({ imageSearchResults: results }),
                    },
                    createAssistantMessage
                  ),
                  createdAt: message?.createdAt || Date.now(),
                }
              : message
          ),
        ],
        titleFor("search", "Web image search")
      );
    } catch (error) {
      updateMessages(
        (nextMessages) => [
          ...nextMessages.map((message) =>
            String(message?.id || "") === searchStatusId
              ? {
                  ...message,
                  ...decorateAssistantMessage(
                    {
                      id: searchStatusId,
                      text: String(error?.message || webSearchUnavailableText),
                    },
                    createAssistantMessage
                  ),
                  createdAt: message?.createdAt || Date.now(),
                }
              : message
          ),
        ],
        titleFor("search", "Web image search")
      );
    }
    return true;
  }

  return false;
}
