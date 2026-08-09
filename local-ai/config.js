const KAGE_LOCAL_AI_CONFIG = {
  enabled: true,

  engine: "transformers-js",

  model: {
    id: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    task: "sentiment-analysis",
    dtype: "q8"
  },

  devices: {
    preferred: "webgpu",
    fallback: "wasm"
  },

  cache: {
    enabled: true
  }
};

export default KAGE_LOCAL_AI_CONFIG;
