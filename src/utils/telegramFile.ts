import axios from "axios";
import fs from "fs";
import path from "path";
import { ensureDirectoryExists } from "./fsUtils";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function downloadTelegramFile(fileId: string, saveDir: string): Promise<string> {
  ensureDirectoryExists(saveDir);

  const fileResponse = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const filePath = fileResponse.data.result.file_path;

  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`;
  const localPath = path.resolve(saveDir, path.basename(filePath));

  const writer = fs.createWriteStream(localPath);
  const response = await axios.get(url, { responseType: "stream" });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(localPath));
    writer.on("error", reject);
  });
}
