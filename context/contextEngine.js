function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(value) {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length >= 3);
}

function uniqueWords(words) {
  return [...new Set(words)];
}

function calculateRelevance(query, text) {
  const queryWords = uniqueWords(getWords(query));
  const textWords = new Set(getWords(text));

  if (queryWords.length === 0 || textWords.size === 0) {
    return 0;
  }

  let matches = 0;

  for (const word of queryWords) {
    if (textWords.has(word)) {
      matches += 1;
    }
  }

  return matches / queryWords.length;
}

function cleanItem(item) {
  if (item === null || item === undefined) {
    return null;
  }

  if (typeof item === "string") {
    return {
      text: item
    };
  }

  if (typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  return item;
}

function getItemText(item) {
  if (!item) {
    return "";
  }

  if (typeof item === "string") {
    return item;
  }

  return [
    item.text,
    item.content,
    item.message,
    item.title,
    item.description,
    item.summary
  ]
    .filter((value) => typeof value === "string")
    .join(" ");
}

function rankItems(items, query) {
  return items
    .map((item, index) => {
      const cleaned = cleanItem(item);

      if (!cleaned) {
        return null;
      }

      const text = getItemText(cleaned);

      return {
        item: cleaned,
        score: calculateRelevance(query, text),
        index
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.index - a.index;
    });
}

function limitByCharacters(items, maxCharacters) {
  const selected = [];
  let totalCharacters = 0;

  for (const entry of items) {
    const text = getItemText(entry.item);

    if (!text) {
      continue;
    }

    if (
      selected.length > 0 &&
      totalCharacters + text.length > maxCharacters
    ) {
      continue;
    }

    selected.push(entry);
    totalCharacters += text.length;

    if (totalCharacters >= maxCharacters) {
      break;
    }
  }

  return selected;
}

function selectRecentMessages(messages, limit) {
  const validMessages = Array.isArray(messages)
    ? messages
        .map(cleanItem)
        .filter(Boolean)
    : [];

  return validMessages.slice(-limit);
}

function selectRelevantItems(items, query, limit, maxCharacters) {
  const validItems = Array.isArray(items)
    ? items
    : [];

  const ranked = rankItems(validItems, query);

  const relevant = ranked.filter(
    (entry) => entry.score > 0
  );

  const fallback = ranked.slice(0, limit);

  const selectedSource =
    relevant.length > 0
      ? relevant.slice(0, limit)
      : fallback;

  return limitByCharacters(
    selectedSource,
    maxCharacters
  );
}

function buildContext({
  userMessage = "",
  messages = [],
  memories = [],
  searchResults = [],
  systemInstructions = "",
  maxRecentMessages = 8,
  maxMemories = 5,
  maxSearchResults = 5,
  maxMemoryCharacters = 6000,
  maxSearchCharacters = 6000
} = {}) {
  const recentMessages = selectRecentMessages(
    messages,
    maxRecentMessages
  );

  const selectedMemories = selectRelevantItems(
    memories,
    userMessage,
    maxMemories,
    maxMemoryCharacters
  );

  const selectedSearchResults = selectRelevantItems(
    searchResults,
    userMessage,
    maxSearchResults,
    maxSearchCharacters
  );

  return {
    userMessage,
    systemInstructions:
      typeof systemInstructions === "string"
        ? systemInstructions
        : "",
    recentMessages,
    memories: selectedMemories.map(
      (entry) => ({
        ...entry.item,
        relevance: Number(entry.score.toFixed(4))
      })
    ),
    searchResults: selectedSearchResults.map(
      (entry) => ({
        ...entry.item,
        relevance: Number(entry.score.toFixed(4))
      })
    )
  };
}

function createContextPrompt(context) {
  const sections = [];

  if (context.systemInstructions) {
    sections.push(
      `SYSTEM INSTRUCTIONS:\n${context.systemInstructions}`
    );
  }

  if (context.memories.length > 0) {
    sections.push(
      [
        "RELEVANT MEMORY:",
        ...context.memories.map((memory) =>
          `- ${getItemText(memory)}`
        )
      ].join("\n")
    );
  }

  if (context.searchResults.length > 0) {
    sections.push(
      [
        "RELEVANT SEARCH RESULTS:",
        ...context.searchResults.map((result) =>
          `- ${getItemText(result)}`
        )
      ].join("\n")
    );
  }

  if (context.recentMessages.length > 0) {
    sections.push(
      [
        "RECENT CONVERSATION:",
        ...context.recentMessages.map((message) =>
          `- ${getItemText(message)}`
        )
      ].join("\n")
    );
  }

  if (context.userMessage) {
    sections.push(
      `CURRENT USER MESSAGE:\n${context.userMessage}`
    );
  }

  return sections.join("\n\n");
}

function buildContextPackage(input = {}) {
  const context = buildContext(input);

  return {
    context,
    prompt: createContextPrompt(context)
  };
}

export {
  buildContext,
  buildContextPackage,
  createContextPrompt,
  calculateRelevance
};
