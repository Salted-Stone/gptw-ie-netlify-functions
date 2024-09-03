// const hubspot = require("@hubspot/api-client");
// const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_API_TOKEN });

exports.handler = async function (event, context) {
  const { body, httpMethod } = event;

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

  // return {
  //   body: JSON.stringify({ data }),
  //   statusCode: 200,
  // };

  return new Response(JSON.stringify({ data }));

  // return new Response("Sorry, no access for you.", { status: 401 });
};
