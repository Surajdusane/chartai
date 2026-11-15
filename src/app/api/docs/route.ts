import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/api/openapi",
  theme: "deepSpace",
  layout: "modern",
  showSidebar: true,
  hideDownloadButton: false,
  hideModels: false,
});