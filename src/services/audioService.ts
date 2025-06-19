import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath.path);

export function convertOggToMp3(inputPath: string, outputDir: string): Promise<string> {
  const outputPath = path.resolve(outputDir, `${path.parse(inputPath).name}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .save(outputPath);
  });
}
