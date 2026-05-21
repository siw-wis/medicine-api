import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ID = process.env.ROBOFLOW_MODEL_ID; 
const ROBOFLOW_VERSION = process.env.ROBOFLOW_VERSION;

app.get("/", (req, res) => {
  res.json({ status: "Medicine API is running" });
});

app.post("/predict", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const roboflowUrl =
      `https://serverless.roboflow.com/${ROBOFLOW_MODEL_ID}/${ROBOFLOW_VERSION}` +
      `?api_key=${ROBOFLOW_API_KEY}` +
      `&image=${encodeURIComponent(imageUrl)}` +
      `&format=json`;

    const response = await fetch(roboflowUrl, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Roboflow request failed",
        details: data
      });
    }

    const name = data.top;
    const confidence = data.confidence;
    const percent = Math.round(confidence * 100);

    res.json({ name, confidence, percent, raw: data });
  } catch (error) {
    res.status(500).json({ error: "Server error", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});