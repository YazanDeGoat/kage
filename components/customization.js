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

  window.dispatchEvent(
    new CustomEvent("kage-customization-updated", {
      detail: updated
    })
  );

  return updated;
}

export function resetCustomization() {
  const settings = {
    ...DEFAULT_SETTINGS
  };

  saveSettings(settings);

  window.dispatchEvent(
    new CustomEvent("kage-customization-updated", {
      detail: settings
    })
  );

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

function injectCustomizationStyles() {
  if (document.getElementById("kageCustomizationStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "kageCustomizationStyles";

  style.textContent = `
    #kageCustomizationButton {
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 5000;

      width: 48px;
      height: 48px;

      border-radius: 14px;

      border: 1px solid #252525;

      background: #0b0b0b;
      color: white;

      font-size: 21px;

      cursor: pointer;

      display: flex;
      align-items: center;
      justify-content: center;

      box-shadow: 0 8px 30px rgba(0,0,0,.45);

      transition:
        transform .15s ease,
        background .15s ease,
        border-color .15s ease;
    }

    #kageCustomizationButton:hover {
      background: #151515;
      border-color: #3a3a3a;
      transform: translateY(-2px);
    }

    #kageCustomizationOverlay {
      position: fixed;
      inset: 0;

      z-index: 6000;

      background: rgba(0,0,0,.72);

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 20px;

      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .kageCustomizationPanel {
      width: min(560px, 100%);

      max-height: 90vh;

      overflow-y: auto;

      background: #080808;

      border: 1px solid #242424;

      border-radius: 22px;

      padding: 24px;

      color: white;

      box-shadow: 0 25px 80px rgba(0,0,0,.7);
    }

    .kageCustomizationHeader {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      gap: 20px;

      margin-bottom: 22px;
    }

    .kageCustomizationHeader h2 {
      margin: 0 0 6px;

      font-size: 22px;
    }

    .kageCustomizationHeader p {
      margin: 0;

      color: #8b8b8b;

      font-size: 13px;
    }

    #kageCustomizationClose {
      width: 36px;
      height: 36px;

      border-radius: 10px;

      border: 1px solid #242424;

      background: #111;
      color: white;

      font-size: 22px;

      cursor: pointer;
    }

    .kageCustomizationBody {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .kageCustomizationBody label {
      margin-top: 9px;

      color: #cfcfcf;

      font-size: 13px;
      font-weight: 600;
    }

    .kageCustomizationBody select,
    .kageCustomizationBody textarea {
      width: 100%;

      background: #101010;

      color: white;

      border: 1px solid #242424;

      border-radius: 12px;

      padding: 13px;

      outline: none;

      font-size: 14px;
    }

    .kageCustomizationBody select:focus,
    .kageCustomizationBody textarea:focus {
      border-color: #444;
    }

    .kageCustomizationBody textarea {
      min-height: 90px;

      resize: vertical;

      font-family: inherit;
    }

    .kageCustomizationActions {
      display: flex;

      gap: 10px;

      margin-top: 20px;
    }

    .kageCustomizationActions button {
      flex: 1;

      border-radius: 12px;

      padding: 13px;

      border: 1px solid #292929;

      background: #151515;

      color: white;

      cursor: pointer;

      font-weight: 600;
    }

    .kageCustomizationActions button:hover {
      background: #202020;
    }

    #kageCustomizationSave {
      background: white;
      color: black;
      border-color: white;
    }

    @media (max-width: 700px) {
      #kageCustomizationButton {
        left: 14px;
        bottom: 14px;
      }

      #kageCustomizationOverlay {
        padding: 12px;
      }

      .kageCustomizationPanel {
        border-radius: 18px;
        padding: 18px;
      }
    }
  `;

  document.head.appendChild(style);
}

function createCustomizationButton() {
  if (document.getElementById("kageCustomizationButton")) {
    return;
  }

  const button = document.createElement("button");

  button.id = "kageCustomizationButton";

  button.type = "button";

  button.setAttribute(
    "aria-label",
    "KAGE Customization"
  );

  button.title = "KAGE Customization";

  button.textContent = "🎭";

  button.addEventListener(
    "click",
    openCustomizationPanel
  );

  document.body.appendChild(button);
}

function openCustomizationPanel() {
  if (
    document.getElementById(
      "kageCustomizationOverlay"
    )
  ) {
    return;
  }

  const settings = loadSettings();

  const overlay =
    document.createElement("div");

  overlay.id =
    "kageCustomizationOverlay";

  overlay.innerHTML = `
    <div
      class="kageCustomizationPanel"
      role="dialog"
      aria-modal="true"
    >

      <div class="kageCustomizationHeader">

        <div>
          <h2>KAGE Customization</h2>

          <p>
            Control how KAGE acts, talks, and responds.
          </p>
        </div>

        <button
          id="kageCustomizationClose"
          type="button"
        >
          ×
        </button>

      </div>


      <div class="kageCustomizationBody">

        <label for="kagePersonality">
          Personality
        </label>

        <select id="kagePersonality">

          <option value="friendly">
            Friendly
          </option>

          <option value="professional">
            Professional
          </option>

          <option value="funny">
            Funny
          </option>

          <option value="direct">
            Direct
          </option>

          <option value="creative">
            Creative
          </option>

          <option value="calm">
            Calm
          </option>

        </select>


        <label for="kageTone">
          Tone
        </label>

        <select id="kageTone">

          <option value="casual">
            Casual
          </option>

          <option value="balanced">
            Balanced
          </option>

          <option value="professional">
            Professional
          </option>

          <option value="playful">
            Playful
          </option>

          <option value="serious">
            Serious
          </option>

        </select>


        <label for="kageResponseStyle">
          Response Style
        </label>

        <select id="kageResponseStyle">

          <option value="short">
            Short
          </option>

          <option value="balanced">
            Balanced
          </option>

          <option value="detailed">
            Detailed
          </option>

          <option value="step-by-step">
            Step-by-step
          </option>

        </select>


        <label for="kageCustomInstructions">
          Custom Instructions
        </label>

        <textarea
          id="kageCustomInstructions"
          placeholder="Tell KAGE how you want it to behave..."
        ></textarea>


        <label for="kageBehaviorRules">
          Behavior Rules
        </label>

        <textarea
          id="kageBehaviorRules"
          placeholder="Example: Explain difficult things simply."
        ></textarea>


        <label for="kagePriorities">
          Priorities
        </label>

        <textarea
          id="kagePriorities"
          placeholder="Example: Accuracy, clarity, usefulness..."
        ></textarea>


        <label for="kageSystemInstructions">
          System Instructions
        </label>

        <textarea
          id="kageSystemInstructions"
          placeholder="Additional KAGE system behavior..."
        ></textarea>


        <div class="kageCustomizationActions">

          <button
            id="kageCustomizationSave"
            type="button"
          >
            Save Changes
          </button>

          <button
            id="kageCustomizationReset"
            type="button"
          >
            Reset
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);


  const personality =
    overlay.querySelector(
      "#kagePersonality"
    );

  const tone =
    overlay.querySelector(
      "#kageTone"
    );

  const responseStyle =
    overlay.querySelector(
      "#kageResponseStyle"
    );

  const customInstructions =
    overlay.querySelector(
      "#kageCustomInstructions"
    );

  const behaviorRules =
    overlay.querySelector(
      "#kageBehaviorRules"
    );

  const priorities =
    overlay.querySelector(
      "#kagePriorities"
    );

  const systemInstructions =
    overlay.querySelector(
      "#kageSystemInstructions"
    );


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


  overlay
    .querySelector(
      "#kageCustomizationClose"
    )
    .addEventListener(
      "click",
      () => overlay.remove()
    );


  overlay
    .querySelector(
      "#kageCustomizationSave"
    )
    .addEventListener(
      "click",
      () => {

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

        overlay.remove();

      }
    );


  overlay
    .querySelector(
      "#kageCustomizationReset"
    )
    .addEventListener(
      "click",
      () => {

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

      }
    );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target === overlay
      ) {
        overlay.remove();
      }

    }
  );
}

function initializeCustomization() {
  injectCustomizationStyles();
  createCustomizationButton();
}

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeCustomization
  );

} else {

  initializeCustomization();

}
