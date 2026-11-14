export const createDatasetTitle = (filename: string) => {
  const base = filename.replace(/\.[^.]+$/, "");
  const words = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const title = words.length > 0 ? words : "New chat";
  return title.charAt(0).toUpperCase() + title.slice(1);
};
