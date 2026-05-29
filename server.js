import express from "express";
import cors from "cors";

const app = express();

// CORS 및 Thunkable 호환 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.text({ type: "*/*", limit: "10mb" }));

const ROBOFLOW_API_KEY = "wz4k4Lfn43IknMloFnuE";
const ROBOFLOW_MODEL_ID = "simsim"; 
const ROBOFLOW_VERSION = "4";

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

    // ────────── [여기에 코드가 추가되었습니다] ──────────
    // 1. http:// 주소를 안전한 https:// 주소로 강제 변환합니다.
    const fixedImageUrl = imageUrl.replace("http://", "https://");
    // 2. 인공지능이 주소를 읽을 수 있게 안전하게 인코딩(글자 변환)합니다.
    const encodedImageUrl = encodeURIComponent(fixedImageUrl);
    // ──────────────────────────────────────────────────

    // 👈 [교정 2] Roboflow 로직에 인코딩된 주소(encodedImageUrl)를 넣어 연결합니다.
    const roboflowUrl =
      `https://serverless.roboflow.com/${ROBOFLOW_MODEL_ID}/${ROBOFLOW_VERSION}` +
      `?api_key=${ROBOFLOW_API_KEY}` +
      `&image=${encodedImageUrl}` + // 👈 이 부분이 encodedImageUrl로 바뀌어야 합니다!
      `&format=json`;

    const response = await fetch(roboflowUrl, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Roboflow request failed",
        details: data
      });
    }

// 1. 인공지능 결과(data)에서 가장 확률이 높은 알약 이름과 점수 찾기
    let medicineName = "알 수 없음";
    let confidence = 0;

    // [형식 A] predictions 배열로 결과가 오는 경우
    if (data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
      const best = data.predictions.reduce((best, current) => current.confidence > best.confidence ? current : best);
      medicineName = best.class || best.name || "알 수 없음";
      confidence = best.confidence || 0;
    } 
    // [형식 B] top 형태로 결과가 오는 경우
    else if (data.top) {
      medicineName = data.top;
      confidence = data.confidence || 0;
    }

    // 2. 소수점 확률(예: 0.925)을 반올림된 퍼센트 숫자(93)로 변환
    let percent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

    // 3. 퉁커블이 기다리는 딱 2개의 주머니에 예쁘게 담아서 보냅니다.
    res.json({ 
      medicineName: medicineName, 
      percent: percent 
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
