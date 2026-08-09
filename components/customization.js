const STORAGE_KEY = "kage-customization";

const DEFAULT_SETTINGS = {
  personality: "friendly",
  tone: "casual",
  responseStyle: "balanced",
  customInstructions: "",
  behaviorRules: "",
  priorities: "",
  systemInstructions: ""
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(saved)
    };
  } catch (error) {
    console.error("KAGE customization load error:", error);

    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(settings)
  );
}

export function getCustomization() {
  return loadSettings();
}

export function updateCustomization(changes) {
  const current = loadSettings();

  const updated = {
    ...current,
    ...changes
  };

  saveSettings(updated);

  return updated;
}

export function resetCustomization() {
  const settings = {
    ...DEFAULT_SETTINGS
  };

  saveSettings(settings);

  return settings;
}

export function buildCustomizationPrompt() {
  const settings = loadSettings();

  return `
KAGE CUSTOMIZATION

PERSONALITY:
${settings.personality}

TONE:
${settings.tone}

RESPONSE STYLE:
${settings.responseStyle}

CUSTOM INSTRUCTIONS:
${settings.customInstructions}

BEHAVIOR RULES:
${settings.behaviorRules}

PRIORITIES:
${settings.priorities}

SYSTEM INSTRUCTIONS:
${settings.systemInstructions}
`.trim();
}

export function createCustomizationPanel() {
  const settings = loadSettings();

  const panel = document.createElement("div");

  panel.className = "customizationPanel";

  panel.innerHTML = `
    <div class="customizationHeader">
      <div>
        <h2>KAGE Customization</h2>
        <p>Control how KAGE acts and responds.</p>
      </div>

      <button
        class="customizationClose"
        id="closeCustomization"
      >
        ×
      </button>
    </div>

    <div class="customizationBody">

      <label>
        Personality
      </label>

      <select id="kagePersonality">
        <option value="friendly">Friendly</option>
        <option value="professional">Professional</option>
        <option value="funny">Funny</option>
        <option value="direct">Direct</option>
        <option value="creative">Creative</option>
        <option value="calm">Calm</option>
      </select>


      <label>
        Tone
      </label>

      <select id="kageTone">
        <option value="casual">Casual</option>
        <option value="balanced">Balanced</option>
        <option value="professional">Professional</option>
        <option value="playful">Playful</option>
        <option value="serious">Serious</option>
      </select>


      <label>
        Response Style
      </label>

      <select id="kageResponseStyle">
        <option value="short">Short</option>
        <option value="balanced">Balanced</option>
        <option value="detailed">Detailed</option>
        <option value="step-by-step">Step-by-step</option>
      </select>


      <label>
        Custom Instructions
      </label>

      <textarea
        id="kageCustomInstructions"
        placeholder="Tell KAGE anything you want it to know about how you want it to respond..."
      ></textarea>


      <label>
        Behavior Rules
      </label>

      <textarea
        id="kageBehaviorRules"
        placeholder="Example: Always explain complicated things simply."
      ></textarea>


      <label>
        Priorities
      </label>

      <textarea
        id="kagePriorities"
        placeholder="Example: Accuracy, usefulness, clarity..."
      ></textarea>


      <label>
        System Instructions
      </label>

      <textarea
        id="kageSystemInstructions"
        placeholder="Additional system-level instructions for KAGE..."
      ></textarea>


      <div class="customizationActions">

        <button id="saveCustomization">
          Save
        </button>

        <button id="resetCustomization">
          Reset
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(panel);

  const personality =
    panel.querySelector("#kagePersonality");

  const tone =
    panel.querySelector("#kageTone");

  const responseStyle =
    panel.querySelector("#kageResponseStyle");

  const customInstructions =
    panel.querySelector("#kageCustomInstructions");

  const behaviorRules =
    panel.querySelector("#kageBehaviorRules");

  const priorities =
    panel.querySelector("#kagePriorities");

  const systemInstructions =
    panel.querySelector("#kageSystemInstructions");


  personality.value =
    settings.personality;

  tone.value =
    settings.tone;

  responseStyle.value =
    settings.responseStyle;

  customInstructions.value =
    settings.customInstructions;

  behaviorRules.value =
    settings.behaviorRules;

  priorities.value =
    settings.priorities;

  systemInstructions.value =
    settings.systemInstructions;


  panel
    .querySelector("#saveCustomization")
    .onclick = () => {

      updateCustomization({

        personality:
          personality.value,

        tone:
          tone.value,

        responseStyle:
          responseStyle.value,

        customInstructions:
          customInstructions.value,

        behaviorRules:
          behaviorRules.value,

        priorities:
          priorities.value,

        systemInstructions:
          systemInstructions.value

      });

      panel.remove();

    };


  panel
    .querySelector("#resetCustomization")
    .onclick = () => {

      const reset =
        resetCustomization();

      personality.value =
        reset.personality;

      tone.value =
        reset.tone;

      responseStyle.value =
        reset.responseStyle;

      customInstructions.value =
        reset.customInstructions;

      behaviorRules.value =
        reset.behaviorRules;

      priorities.value =
        reset.priorities;

      systemInstructions.value =
        reset.systemInstructions;

    };


  panel
    .querySelector("#closeCustomization")
    .onclick = () => {

      panel.remove();

    };


  return panel;
}
