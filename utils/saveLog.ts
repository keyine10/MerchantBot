import fs from "fs";

/**
 * Safely writes data to a JSON file, ensuring the directory exists.
 * @param filePath Path to the file (e.g., 'logs/search_results.json')
 * @param data Data to write (object or string)
 */
export function saveLog(filePath: string, data: any) {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    filePath,
    typeof data === "string" ? data : JSON.stringify(data, null, 2),
    "utf-8"
  );
}
