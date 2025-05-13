import express from "express";
import cors from "cors";
import path from "path";
import { Rembg } from "rembg-node";
import sharp from "sharp";
import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Supabase config
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = "images";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

// Utility function to generate random file name
function generateRandomFileName(originalName) {
  const ext = path.extname(originalName);
  const base = crypto.randomBytes(6).toString("hex");
  return `${base}${ext}`;
}

// Upload route + remove bg
app.post("/api/upload", async (req, res) => {
  try {
    const fileBuffer = req.body;
    const originalFileName = req.headers["x-filename"];
    const mimeType = req.headers["x-mimetype"];

    if (!fileBuffer || !originalFileName || !mimeType) {
      return res.status(400).json({ message: "Invalid file upload" });
    }

    const randomOriginalFileName = generateRandomFileName(originalFileName);
    const originalPath = `original/${randomOriginalFileName}`;

    // Upload original file to Supabase Storage
    const { error: uploadError1 } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(originalPath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError1) throw uploadError1;

    const { data: urlData1 } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(originalPath);

    const originalFileUrl = urlData1.publicUrl;

    // Process image: remove background + convert to webp
    const input = sharp(fileBuffer);
    const rembg = new Rembg({});
    const output = await rembg.remove(input);
    const buffer = await output.webp().toBuffer();

    const processedFileName = `processed/${randomOriginalFileName.replace(
      /\.[^/.]+$/,
      ".webp"
    )}`;

    const { error: uploadError2 } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(processedFileName, buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError2) throw uploadError2;

    const { data: urlData2 } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(processedFileName);

    const processedFileUrl = urlData2.publicUrl;

    res.json({
      message: "Files uploaded and processed successfully!",
      original: originalFileUrl,
      processed: processedFileUrl,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Image processing failed", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖼️ Server is running on port ${PORT}`);
});
