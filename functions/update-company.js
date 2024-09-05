const hubspot = require("@hubspot/api-client");
const axios = require("axios");
const FormData = require("form-data");

const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_API_TOKEN });

const uploadFile = async (file, fileName) => {
  const form = new FormData();

  const fileOptions = {
    access: "PUBLIC_NOT_INDEXABLE",
  };

  const buffer = Buffer.from(file.split(",")[1], "base64");

  form.append("file", buffer, { filename: fileName });
  form.append("options", JSON.stringify(fileOptions));
  form.append("folderId", process.env.COMPANY_UPLOADS_FOLDER_ID);

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.hubapi.com/files/v3/files",
    headers: {
      Authorization: `Bearer ${process.env.HS_API_TOKEN}`,
      ...form.getHeaders(),
    },
    data: form,
  };

  try {
    const res = await axios(config);

    return res?.data;
  } catch (e) {
    e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
  }
};

async function* asyncIterable(data) {
  const keys = Object.keys(data);
  const values = new Object();
  const numFields = ["statistic", "tenure_2years", "tenure_6_10years", "tenure_11_15years", "tenure_16_20years", "tenure_over_20years"];

  for (const key of keys) {
    let setVal = null;
    let setKey = key;
    switch (key) {
      case "location_lat":
      case "location_long":
        values["location"] = {
          lat: parseFloat(data["location_lat"]),
          long: parseFloat(data["location_long"]),
          type: "location",
        };
        setKey = "location";
        setVal = values["location"];
        break;
      case "industry":
        const industries = [];
        if (data["industry"]) {
          if (Array.isArray(data["industry"])) {
            data["industry"].forEach((ind) => {
              industries.push({
                name: ind,
                type: "option",
              });
            });
            values["industry"] = industries;
          } else {
            values["industry"] = [
              {
                name: data["industry"],
                type: "option",
              },
            ];
          }
        }

        setVal = values["industry"];
        break;
      case "company_logo":
        const logo = await uploadFile(data["company_logo"].file, data["company_logo"].file_name);
        if (logo) {
          values["company_logo"] = {
            url: logo.url,
            width: logo.width,
            height: logo.height,
            type: "image",
          };
          setVal = values["company_logo"];
        }
        break;
      case "featured_thumbnail":
        const thumb = await uploadFile(data["featured_thumbnail"].file, data["featured_thumbnail"].file_name);
        if (thumb) {
          values["featured_thumbnail"] = {
            url: thumb.url,
            width: thumb.width,
            height: thumb.height,
            type: "image",
          };
          setVal = values["featured_thumbnail"];
        }
        break;
      default:
        if (numFields.indexOf(key) !== -1) {
          values[key] = parseFloat(data[key]);
        } else {
          values[key] = data[key];
        }
        setVal = values[key];
        break;
    }

    if (setKey && setVal) {
      yield {
        name: setKey,
        value: setVal,
      };
    }
  }
}

exports.handler = async function (event, context) {
  const { body, httpMethod } = event;

  let headers = {
    "Access-Control-Allow-Origin": "*",
  };

  if (httpMethod === "POST") {
    const data = JSON.parse(body);
    const tableIdOrName = process.env.HUBDB_TABLE_ID;
    const limit = 1;
    const email = data?.email;

    const getAllVAlues = async () => {
      const allValues = new Object();

      for await (const res of asyncIterable(data)) {
        // console.log(res);
        if (res?.name) {
          allValues[res.name] = res.value;
        }
      }

      return allValues;
    };

    const values = await getAllVAlues();

    let query = new URLSearchParams();

    if (limit) {
      query.set("limit", limit);
    }

    if (email) {
      query.set("email", email);
    }

    if (email) {
      try {
        const response = await hubspotClient.apiRequest({
          path: `/cms/v3/hubdb/tables/${tableIdOrName}/rows?${query.toString()}`,
          method: "GET",
        });
        const json = await response.json();
        // console.log(JSON.stringify(json, null, 2));

        if (json?.total) {
          const company = json.results[0];
          const HubDbTableRowV3Request = { values };

          const updateRow = await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableIdOrName, company.id, HubDbTableRowV3Request);
          console.log(JSON.stringify(values, null, 2));

          const publishTable = await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableIdOrName);

          return {
            headers,
            statusCode: 200,
          };
        }

        return {
          headers,
          statusCode: 404,
        };
      } catch (e) {
        e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
        return {
          headers,
          statusCode: 500,
        };
      }
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
