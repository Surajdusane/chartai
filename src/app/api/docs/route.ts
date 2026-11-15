import { ApiReference } from "@scalar/nextjs-api-reference";
import { NextResponse } from "next/server";

const TITLE = "Chart AI API Reference";
const DESCRIPTION = "REST API reference for Chart AI - chat with your spreadsheet.";

const HEAD_TAGS = `
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="application-name" content="Chart AI" />
    <meta name="description" content="${DESCRIPTION}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
  `;

const handler = ApiReference({
  url: "/api/openapi",
  theme: "deepSpace",
  layout: "modern",
  showSidebar: true,
  hideDownloadButton: false,
  hideModels: false,
  pageTitle: TITLE,
  favicon: "/favicon.svg",
  metaData: {
    title: TITLE,
    description: DESCRIPTION,
    ogTitle: TITLE,
    ogDescription: DESCRIPTION,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: TITLE,
    twitterDescription: DESCRIPTION,
  },
});

export async function GET() {
  const response = handler();
  const html = await response.text();

  return new NextResponse(html.replace("</head>", `${HEAD_TAGS}</head>`), {
    status: response.status,
    headers: response.headers,
  });
}