// const hubspot = require("@hubspot/api-client");
// const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_API_TOKEN });

exports.handler = async function (event, context) {
  const { body, httpMethod } = event;

  let HEADERS = {
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin",
    "Content-Type": "application/json", //optional
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "8640",
  };

  //This solves the "No ‘Access-Control-Allow-Origin’ header is present on the requested resource."

  HEADERS["Access-Control-Allow-Origin"] = "*";
  HEADERS["Vary"] = "Origin";

  const data = JSON.parse(body);

  /* const values = {
  multiselect: [
    {
      id: "1",
      name: "Option 1",
      type: "option",
      order: 0,
    },
    {
      id: "2",
      name: "Option 2",
      type: "option",
      order: 1,
    },
  ],
  text_column: "sample text value",
  number_column: 76,
};
const HubDbTableRowV3Request = { values };
const tableIdOrName = "18579329";
const rowId = "rowId";

try {
  const apiResponse = await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableIdOrName, rowId, HubDbTableRowV3Request);
  console.log(JSON.stringify(apiResponse, null, 2));
} catch (e) {
  e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
} */

  console.log(data);

  if (httpMethod === "OPTIONS") {
    console.log("OPTIONS request received");
    return;
  }

  return {
    body: JSON.stringify({ data }),
    HEADERS,
    statusCode: 200,
  };

  // return new Response(JSON.stringify({ data }), { status: 200 });

  // return new Response("Sorry, no access for you.", { status: 401 });
};
