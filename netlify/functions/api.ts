import serverless from "serverless-http";
import app from "../../src/api.server";

export const handler = serverless(app);
