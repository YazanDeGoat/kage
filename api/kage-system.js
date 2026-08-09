const {
  createKageSystem
} = require("../backend/kageSystem");


function sendJson(
  res,
  status,
  data
) {

  res.status(status);

  res.setHeader(
    "Content-Type",
    "application/json"
  );

  res.end(
    JSON.stringify(data)
  );

}


function parseBody(req) {

  if (!req.body) {
    return {};
  }


  if (typeof req.body === "object") {
    return req.body;
  }


  if (typeof req.body === "string") {

    try {

      return JSON.parse(
        req.body
      );

    } catch {

      return {};

    }

  }


  return {};

}


module.exports = async function handler(
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
      parseBody(req);


    const custom =
      body.settings || {};


    const result =
      createKageSystem(
        custom
      );


    return sendJson(

      res,

      200,

      {

        success: true,

        name:
          result.system.name,

        system:
          result.system,

        systemPrompt:
          result.systemPrompt

      }

    );

  }

  catch (error) {

    console.log(
      "KAGE SYSTEM ERROR:",
      error
    );


    return sendJson(

      res,

      500,

      {

        success: false,

        text:
          "kage system error: " +
          (
            error?.message ||
            "unknown error"
          )

      }

    );

  }

};
