import * as dotenv from "dotenv";

// Read and load `.env` file into `process.env`
dotenv.config();

export default {
    httpPort: Number(process.env.SERVER_PORT) || 8081,
    codeChain: {
        host: process.env.CODECHAIN_HOST || "http://101.53.152.47:8080"
    },
    elasticSearch: {
        host: process.env.ELASTICSEARCH_HOST || "http://elastic:changeme@101.53.152.47:9200"
    }
};
