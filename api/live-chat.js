const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const SEARCH_URL =
  process.env.KAGE_SEARCH_URL ||
  process.env.SEARCH_URL ||
  "";

const OPENROUTER_KEY =
  process.env.OPENROUTER_API_KEY ||
  process.env.OPENROUTER_KEY ||
  "";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";


function sendJson(res, status, data) {

  res.status(status);

  res.setHeader(
    "Content-Type",
    "application/json"
  );

  res.end(
    JSON.stringify(data)
  );

}


function getPrompt(body) {

  if (!body) {
    return "";
  }

  return String(
    body.prompt ||
    body.message ||
    ""
  ).trim();

}


function needsSearch(text) {

  const value =
    text.toLowerCase();

  const searchWords = [

    "latest",
    "today",
    "current",
    "now",
    "recent",
    "news",
    "weather",
    "price",
    "prices",
    "stock",
    "score",
    "schedule",
    "this week",
    "this month",
    "2026",
    "look up",
    "search",
    "what happened",
    "who won"

  ];

  return searchWords.some(
    word =>
      value.includes(word)
  );

}


async function getSearchContext(prompt) {

  if (!SEARCH_URL) {

    return {

      success: false,

      results: []

    };

  }


  try {

    const response =
      await fetch(

        SEARCH_URL,

        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              prompt

            })

        }

      );


    const raw =
      await response.text();


    if (!response.ok) {

      console.log(
        "SEARCH ERROR:",
        raw
      );

      return {

        success: false,

        results: []

      };

    }


    let data;

    try {

      data =
        JSON.parse(raw);

    }

    catch {

      return {

        success: false,

        results: []

      };

    }


    return {

      success:
        data.success === true,

      results:
        Array.isArray(
          data.results
        )
          ? data.results
          : []

    };

  }

  catch (error) {

    console.log(
      "SEARCH CONNECTION ERROR:",
      error
    );

    return {

      success: false,

      results: []

    };

  }

}


function buildSearchContext(results) {

  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {

    return "";

  }


  return results

    .slice(0, 8)

    .map(
      (result, index) => {

        const title =
          result.title ||
          result.name ||
          "";

        const snippet =
          result.snippet ||
          result.description ||
          result.text ||
          "";

        const url =
          result.url ||
          result.link ||
          "";

        return (

          `[${index + 1}] ${title}\n` +

          `${snippet}\n` +

          `${url}`

        );

      }

    )

    .join("\n\n");

}


function buildSystemPrompt(searchContext) {

  const base =

    "you are kage. " +

    "kage is an independent AI system " +

    "that controls conversation behavior, " +

    "context, memory, tools, search, and " +

    "provider routing. " +

    "respond naturally and accurately.";


  if (!searchContext) {

    return base;

  }


  return (

    base +

    "\n\n" +

    "LIVE SEARCH CONTEXT:\n" +

    searchContext +

    "\n\n" +

    "Use the live search context when " +

    "answering the user's request. " +

    "Do not claim information is current " +

    "unless it is supported by the supplied " +

    "search context."

  );

}


async function askOpenRouter(
  prompt,
  searchContext
) {

  if (!OPENROUTER_KEY) {

    throw new Error(
      "missing OPENROUTER_API_KEY"
    );

  }


  const systemPrompt =
    buildSystemPrompt(
      searchContext
    );


  const response =
    await fetch(

      OPENROUTER_URL,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${OPENROUTER_KEY}`,

          "HTTP-Referer":
            "https://kage.vercel.app",

          "X-Title":
            "KAGE"

        },

        body:
          JSON.stringify({

            model:
              OPENROUTER_MODEL,

            messages: [

              {

                role:
                  "system",

                content:
                  systemPrompt

              },

              {

                role:
                  "user",

                content:
                  prompt

              }

            ]

          })

      }

    );


  const raw =
    await response.text();


  console.log(
    "OPENROUTER STATUS:",
    response.status
  );


  if (!response.ok) {

    console.log(
      "OPENROUTER ERROR:",
      raw
    );

    throw new Error(
      "OpenRouter request failed"
    );

  }


  let data;

  try {

    data =
      JSON.parse(raw);

  }

  catch {

    throw new Error(
      "OpenRouter returned invalid JSON"
    );

  }


  const text =
    data?.choices?.[0]?.message?.content;


  if (!text) {

    throw new Error(
      "OpenRouter returned no message"
    );

  }


  return text;

}


export default async function handler(
  req,
  res
) {

  if (
    req.method !== "POST"
  ) {

    return sendJson(

      res,

      405,

      {

        success: false,

        text:
          "method not allowed"

      }

    );

  }


  try {

    const body =
      typeof req.body === "string"

        ? JSON.parse(req.body)

        : req.body || {};


    const prompt =
      getPrompt(body);


    if (!prompt) {

      return sendJson(

        res,

        400,

        {

          success: false,

          text:
            "missing message"

        }

      );

    }


    let searchContext = "";

    let searched = false;


    if (
      needsSearch(prompt)
    ) {

      const search =
        await getSearchContext(
          prompt
        );


      searchContext =
        buildSearchContext(
          search.results
        );


      searched =
        search.success;

    }


    const text =
      await askOpenRouter(

        prompt,

        searchContext

      );


    return sendJson(

      res,

      200,

      {

        success: true,

        text,

        search: searched,

        searchContext:
          searchContext || null

      }

    );

  }

  catch (error) {

    console.log(
      "LIVE CHAT ERROR:",
      error
    );


    return sendJson(

      res,

      500,

      {

        success: false,

        text:
          "kage live chat error: " +
          (
            error?.message ||
            "unknown error"
          )

      }

    );

  }

}
