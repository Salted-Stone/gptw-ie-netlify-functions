const hubspot = require("@hubspot/api-client");
const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_API_TOKEN });

exports.handler = async function (event, context) {
  const { body, httpMethod } = event;

  let headers = {
    "Access-Control-Allow-Origin": "*",
  };

  if (httpMethod === "POST") {
    const data = JSON.parse(body);

    /*   const values = {
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
const HubDbTableRowV3Request = { values }; */
    const tableIdOrName = process.env.HUBDB_TABLE_ID;
    const limit = 1;
    const email = data?.find(({ name }) => name === "company_email")?.value;

    let query = new URLSearchParams();

    if (limit) {
      query.set("limit", limit);
    }

    if (email) {
      query.set("email", email);
    }

    console.log(data);

    if (email) {
      try {
        const response = await hubspotClient.apiRequest({
          path: `/cms/v3/hubdb/tables/${tableIdOrName}/rows?${query.toString()}`,
          method: "GET",
        });
        const json = await response.json();
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
      }

      return {
        body: JSON.stringify({ json }),
        headers,
        statusCode: 200,
      };
    } else {
      return {
        headers,
        statusCode: 404,
      };
    }
  } else {
    return {
      headers,
      statusCode: 405,
    };
  }
};
