const DEFAULT_LIMITS = {
  maxMessages: 24,
  maxCharacters: 16000,
  maxSystemCharacters: 8000,
  maxMemoryCharacters: 6000,
  maxSearchCharacters: 6000
};

function cleanText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => {
      return (
        message &&
        typeof message === "object" &&
        typeof message.role === "string" &&
        typeof message.content === "string" &&
        message.content.trim()
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }));
}

function limitText(text, maxCharacters) {
  const value = cleanText(text);

  if (!value) {
    return "";
  }

  if (value.length <= maxCharacters) {
    return value;
  }

  return value.slice(
    value.length - maxCharacters
  );
}

function buildContext({
  systemPrompt = "",
  messages = [],
  memory = "",
  searchContext = "",
  limits = {}
} = {}) {
  const finalLimits = {
    ...DEFAULT_LIMITS,
    ...limits
  };

  const cleanedMessages = cleanMessages(messages);

  const limitedMessages =
    cleanedMessages.slice(
      -finalLimits.maxMessages
    );

  const finalSystemPrompt = limitText(
    systemPrompt,
    finalLimits.maxSystemCharacters
  );

  const finalMemory = limitText(
    memory,
    finalLimits.maxMemoryCharacters
  );

  const finalSearchContext = limitText(
    searchContext,
    finalLimits.maxSearchCharacters
  );

  const context = [];

  if (finalSystemPrompt) {
    context.push({
      type: "system",
      content: finalSystemPrompt
    });
  }

  if (finalMemory) {
    context.push({
      type: "memory",
      content: finalMemory
    });
  }

  if (finalSearchContext) {
    context.push({
      type: "search",
      content: finalSearchContext
    });
  }

  for (const message of limitedMessages) {
    context.push({
      type: "message",
      role: message.role,
      content: message.content
    });
  }

  let totalCharacters = 0;

  for (const item of context) {
    totalCharacters += item.content.length;
  }

  while (
    totalCharacters >
      finalLimits.maxCharacters &&
    context.length > 1
  ) {
    const removableIndex =
      context.findIndex((item) => {
        return item.type === "message";
      });

    if (removableIndex === -1) {
      break;
    }

    totalCharacters -=
      context[removableIndex].content.length;

    context.splice(removableIndex, 1);
  }

  return {
    context,
    messageCount: context.filter(
      (item) => item.type === "message"
    ).length,
    characterCount: context.reduce(
      (total, item) =>
        total + item.content.length,
      0
    )
  };
}

function contextToMessages(contextResult) {
  if (
    !contextResult ||
    !Array.isArray(contextResult.context)
  ) {
    return [];
  }

  const output = [];

  for (const item of contextResult.context) {
    if (item.type === "system") {
      output.push({
        role: "system",
        content: item.content
      });

      continue;
    }

    if (item.type === "memory") {
      output.push({
        role: "system",
        content:
          `Relevant memory:\n${item.content}`
      });

      continue;
    }

    if (item.type === "search") {
      output.push({
        role: "system",
        content:
          `Relevant search context:\n${item.content}`
      });

      continue;
    }

    if (item.type === "message") {
      output.push({
        role: item.role,
        content: item.content
      });
    }
  }

  return output;
}

function getContextStats(contextResult) {
  if (!contextResult) {
    return {
      messageCount: 0,
      characterCount: 0
    };
  }

  return {
    messageCount:
      Number(contextResult.messageCount) || 0,
    characterCount:
      Number(contextResult.characterCount) || 0
  };
}

module.exports = {
  buildContext,
  contextToMessages,
  getContextStats
};
