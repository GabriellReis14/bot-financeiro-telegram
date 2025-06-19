import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export async function transcribeAudio(filePath: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      ...formData.getHeaders(),
    },
  });

  return response.data.text;
}
