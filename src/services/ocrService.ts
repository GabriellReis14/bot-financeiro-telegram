import Tesseract from "tesseract.js";

export async function runOCR(imagePath: string): Promise<string> {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imagePath, "por"); // 'por' = português
    return text;
  } catch (error) {
    console.error("Erro ao processar OCR:", error);
    return "";
  }
}
