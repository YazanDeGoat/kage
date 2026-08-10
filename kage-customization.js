/* KAGE Customization
   Persistent user preferences without touching the chat engine.
*/
const KAGE_CUSTOMIZATION_KEY = "kage_customization";
const DEFAULT_CUSTOMIZATION = {
  personality: "kage",
  responseLength: "balanced",
  fasterResponses: true,
  accent: "white"
};
export function getKageCustomization() {
  try {
    const saved = localStorage.getItem(KAGE_CUSTOMIZATION_KEY);
    if (!saved) {
      return { ...DEFAULT_CUSTOMIZATION };
    }
    return {
      ...DEFAULT_CUSTOMIZATION,
      ...JSON.parse(saved)
    };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION };
  }
}
export function saveKageCustomization(changes = {}) {
  const next = {
    ...getKageCustomization(),
    ...changes
  };
  localStorage.setItem(
    KAGE_CUSTOMIZATION_KEY,
    JSON.stringify(next)
  );
  window.dispatchEvent(
    new CustomEvent("kage:customization-changed", {
      detail: next
    })
  );
  return next;
}
export function getKageResponsePreferences() {
  const settings = getKageCustomization();
  return {
    personality: settings.personality,
    responseLength: settings.responseLength,
    fasterResponses: settings.fasterResponses
  };
}
export function setKagePersonality(personality) {
  return saveKageCustomization({ personality });
}
export function setKageResponseLength(responseLength) {
  return saveKageCustomization({ responseLength });
}
export function setKageFasterResponses(enabled) {
  return saveKageCustomization({
    fasterResponses: Boolean(enabled)
  });
}
