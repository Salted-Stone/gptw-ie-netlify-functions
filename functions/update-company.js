const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

const hubspot = require("@hubspot/api-client");
const axios = require("axios");
const FormData = require("form-data");

const hubspotClient = new hubspot.Client({ accessToken: process.env.HS_API_TOKEN });

const uploadFile = async (file, fileName) => {
  const form = new FormData();
  const fileOptions = {
    access: "PUBLIC_NOT_INDEXABLE",
  };

  try {
    if (!file || !file.includes(",")) {
      throw new Error("Invalid file format");
    }

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
    const res = await axios(config);
    return res?.data;
  } catch (e) {
    e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
    // Optionally capture the exception in Sentry
    Sentry.captureException(e);
  }
};

async function* asyncIterable(data) {
  const keys = Object.keys(data);
  const values = {};
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
        if (data["company_logo"]?.file && data["company_logo"]?.file_name) {
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
        }
        break;
      case "featured_thumbnail":
        if (data["featured_thumbnail"]?.file && data["featured_thumbnail"]?.file_name) {
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
        }
        break;
      case "word_from_the_top_image":
        if (data["word_from_the_top_image"]?.file && data["word_from_the_top_image"]?.file_name) {
          const topImage = await uploadFile(data["word_from_the_top_image"].file, data["word_from_the_top_image"].file_name);
          if (topImage) {
            values["word_from_the_top_image"] = {
              url: topImage.url,
              width: topImage.width,
              height: topImage.height,
              type: "image",
            };
            setVal = values["word_from_the_top_image"];
          }
        }
        break;
      case "culture_overview_image":
        if (data["culture_overview_image"]?.file && data["culture_overview_image"]?.file_name) {
          const cultureImage = await uploadFile(data["culture_overview_image"].file, data["culture_overview_image"].file_name);
          if (cultureImage) {
            values["culture_overview_image"] = {
              url: cultureImage.url,
              width: cultureImage.width,
              height: cultureImage.height,
              type: "image",
            };
            setVal = values["culture_overview_image"];
          }
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

const saveLog = async function (values, rowName) {
  const tableIdLogs = process.env.HUBDB_LOGS_TABLE_ID;
  const HubDbTableRowV3RequestLogs = { values: values, name: rowName };

  try {
    const apiResponse = await hubspotClient.cms.hubdb.rowsApi.createTableRow(tableIdLogs, HubDbTableRowV3RequestLogs);
    return apiResponse;
  } catch (e) {
    e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);
    Sentry.captureException(e);
    await Sentry.flush(2000);
    return false;
  }
};

exports.handler = async (event, context) => {
  // Handle preflight requests (OPTIONS method)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://greatplacetowork.ie", // Allow only this origin
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type", // Allowed headers
        "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
      },
      body: "", // No body for OPTIONS requests
    };
  }
  // Handle POST requests
  if (event.httpMethod === "POST") {
    const { body, httpMethod } = event;
    // const dateNow = new Date();
    const valuesLogs = { status: "", payload: "", date: Date.now(), error_code: "" };

    valuesLogs.payload = JSON.parse(body);

    if (typeof valuesLogs.payload["company_logo"] !== "undefined") {
      valuesLogs.payload["company_logo"] = valuesLogs.payload["company_logo"].file_name;
    }
    if (typeof valuesLogs.payload["featured_thumbnail"] !== "undefined") {
      valuesLogs.payload["featured_thumbnail"] = valuesLogs.payload["featured_thumbnail"].file_name;
    }
    if (typeof valuesLogs.payload["word_from_the_top_image"] !== "undefined") {
      valuesLogs.payload["word_from_the_top_image"] = valuesLogs.payload["word_from_the_top_image"].file_name;
    }
    if (typeof valuesLogs.payload["culture_overview_image"] !== "undefined") {
      valuesLogs.payload["culture_overview_image"] = valuesLogs.payload["culture_overview_image"].file_name;
    }

    valuesLogs.payload = JSON.stringify(valuesLogs.payload);
    // console.log(valuesLogs);

    let headers = {
      "Access-Control-Allow-Origin": "https://greatplacetowork.ie",
    };
    const data = JSON.parse(body);
    const tableIdOrName = process.env.HUBDB_TABLE_ID;
    const limit = 1;
    const email = data?.email;
    const companyName = data?.name;

    try {
      if (httpMethod === "POST") {
        const getAllValues = async () => {
          const allValues = {};

          for await (const res of asyncIterable(data)) {
            // console.log(res);
            if (res?.name && res?.name != "email" && res?.name != "name") {
              allValues[res.name] = res.value;
            }
          }

          return allValues;
        };

        const values = await getAllValues();

        let query = new URLSearchParams();

        if (limit) {
          query.set("limit", limit);
        }

        if (email) {
          query.set("email", email);
        }

        if (companyName) {
          query.set("name", companyName);
        }

        if (email) {
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
            // console.log(JSON.stringify(values, null, 2));

            const publishTable = await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableIdOrName);

            valuesLogs.status = {
              name: "success",
              type: "option",
            };
            valuesLogs.error_code = "200";

            await saveLog(valuesLogs, companyName);

            return {
              headers,
              statusCode: 200,
            };
          }

          valuesLogs.status = {
            name: "error",
            type: "option",
          };
          valuesLogs.error_code = "404";

          await saveLog(valuesLogs, companyName);

          return {
            headers,
            statusCode: 404,
          };
        } else {
          valuesLogs.status = {
            name: "error",
            type: "option",
          };
          valuesLogs.error_code = "400";

          await saveLog(valuesLogs, companyName);

          return {
            headers,
            statusCode: 400,
          };
        }
      } else {
        valuesLogs.status = {
          name: "error",
          type: "option",
        };
        valuesLogs.error_code = "405";

        await saveLog(valuesLogs, companyName);

        return {
          headers,
          statusCode: 405,
        };
      }
    } catch (e) {
      valuesLogs.status = {
        name: "error",
        type: "option",
      };
      valuesLogs.error_code = "500";

      await saveLog(valuesLogs, companyName);

      e.message === "HTTP request failed" ? console.error(JSON.stringify(e.response, null, 2)) : console.error(e);

      Sentry.captureException(e);
      await Sentry.flush(2000);

      return {
        headers,
        statusCode: 500,
      };
    }
  }
};
