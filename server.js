import express from "express";
import cors from "cors";

const app = express();

// CORS 및 Thunkable 호환 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.text({ type: "*/*", limit: "10mb" }));

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ID = process.env.ROBOFLOW_MODEL_ID; 
const ROBOFLOW_VERSION = process.env.ROBOFLOW_VERSION;

app.get("/", (req, res) => {
  res.json({ status: "Medicine API is running" });
});

app.post("/predict", async (req, res) => {
  try { // 👈 [교정 1] 누락되었던 try 문을 정상 배치했습니다.
    let imageUrl = null;

    // 1. 정상적인 JSON 객체로 들어온 경우
    if (req.body && typeof req.body === "object") {
      imageUrl = req.body.imageUrl;
    }

    // 2. Thunkable 특성상 텍스트 문자열(String)로 들어온 경우
    if (!imageUrl && typeof req.body === "string") {
      try {
        const parsedBody = JSON.parse(req.body.trim());
        imageUrl = parsedBody.imageUrl;
      } catch (error) {
        console.log("JSON 파싱 에러:", error.message);
      }
    }

    // 3. 주소창(Query String)에 포함되어 들어온 경우
    if (!imageUrl && req.query) {
      imageUrl = req.query.imageUrl;
    }

    // 검증: 모든 경로에서 imageUrl 추출을 실패했을 때
    if (!imageUrl) {
      return res.status(400).json({
        error: "imageUrl is required",
        receivedBody: req.body,
        receivedType: typeof req.body
      });
    }

    // 👈 [교정 2] 중복되었던 옛날 불필요한 코드를 모두 정리하고 Roboflow 로직과 바로 연결했습니다.
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
