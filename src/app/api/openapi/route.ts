import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const OPEN_API_FILE = path.resolve("public/openapi.json");

export async function GET() {
  try {
    const content = readFileSync(OPEN_API_FILE, "utf8");
    const spec = JSON.parse(content);
    return NextResponse.json(spec);
  } catch {
    return NextResponse.json(
      { error: "OpenAPI spec not found. Run `bun run openapi:generate` first." },
      { status: 404 },
    );
  }
}