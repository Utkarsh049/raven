import { NextResponse } from "next/server"

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000"
  const spec = {
    openapi: "3.0.3",
    info: { title: "Raven API", version: "1.0.0", description: "External control for Raven — ChatGPT Actions / Claude MCP / Gemini function calling. Auth: Bearer RAVEN_API_KEY or x-raven-key." },
    servers: [{ url: base }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "RAVEN_API_KEY" },
        apiKeyHeader: { type: "apiKey", in: "header", name: "x-raven-key" },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
    paths: {
      "/api/raven/nodes": {
        get: {
          summary: "List nodes",
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["branch", "year", "subject", "chapter", "topic"] } },
            { name: "status", in: "query", schema: { type: "string", enum: ["published", "draft"] } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "ok" } },
        },
        post: {
          summary: "Create node",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "type"],
                  properties: {
                    title: { type: "string" },
                    type: { type: "string", enum: ["branch", "year", "subject", "chapter", "topic"] },
                    slug: { type: "string" },
                    parentSlug: { type: "string" },
                    parentType: { type: "string" },
                    parentId: { type: "string" },
                    status: { type: "string", enum: ["draft", "published"] },
                    blocks: { type: "array" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "created" } },
        },
      },
      "/api/mcp": {
        get: { summary: "MCP discovery", responses: { "200": { description: "ok" } } },
        post: {
          summary: "MCP tools/call",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { type: "object", properties: { tool: { type: "string" }, name: { type: "string" }, arguments: { type: "object" }, args: { type: "object" }, method: { type: "string" }, params: { type: "object" } } } },
            },
          },
          responses: { "200": { description: "ok" } },
        },
      },
    },
  }
  return NextResponse.json(spec)
}
