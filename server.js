import express from "express";
import cors from "cors";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.text({ type: "*/*", limit: "10mb" }));

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

    app.post("/predict", async (req, res) => {
  let imageUrl = null;

  if (req.body && typeof req.body === "object") {
    imageUrl = req.body.imageUrl;
  }

  if (!imageUrl && typeof req.body === "string") {
    try {
      const parsedBody = JSON.parse(req.body.trim());
      imageUrl = parsedBody.imageUrl;
    } catch (error) {
      console.log("JSON 파싱 에러:", error.message);
    }
  }

  if (!imageUrl && req.query) {
    imageUrl = req.query.imageUrl;
  }

  if (!imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required",
      receivedBody: req.body
    });
  }

  // 여기서부터 아래는 기존의 Roboflow 관련 코드를 그대로 두시면 됩니다!

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
