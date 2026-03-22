const textToSpeech = require('@google-cloud/text-to-speech');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 1. NẠP SERVICE ACCOUNT TRỰC TIẾP
const KEY_PATH = path.join(__dirname, 'service_account.json');
let ttsClient;
try {
  // Khởi tạo client bằng file key nằm cùng cấp
  ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: KEY_PATH
  });
  console.log("✅ Google TTS Client initialized with service_account.json");
} catch (err) {
  console.error("❌ Failed to initialize Google TTS Client:", err.message);
}

const FPT_AI_API_KEY = process.env.FPT_AI_API_KEY;

const audioService = {
  /**
   * Tổng hợp âm thanh từ văn bản
   */
  synthesize: async (text, langCode) => {
    // --- TIẾNG VIỆT -> DÙNG FPT.AI ---
    if (langCode.startsWith('vi')) {
      try {
        const response = await axios.post('https://api.fpt.ai/hmi/tts/v5', text, {
          headers: {
            'api-key': FPT_AI_API_KEY,
            'speed': '',
            'voice': 'banmai',
            'Content-Type': 'text/plain'
          }
        });

        if (response.data?.async) {
          const asyncUrl = response.data.async;
          let audioBuffer = null;
          let attempts = 0;

          while (attempts < 15) {
            try {
              const checkRes = await axios.get(asyncUrl, { responseType: 'arraybuffer' });
              if (checkRes.status === 200) {
                audioBuffer = Buffer.from(checkRes.data);
                break;
              }
            } catch (e) {
              attempts++;
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          if (audioBuffer) return audioBuffer;
        }
        throw new Error(`FPT.AI failed: ${JSON.stringify(response.data)}`);
      } catch (error) {
        console.error("FPT Error:", error.response?.data || error.message);
        throw error;
      }
    }

    // --- CÁC NGÔN NGỮ KHÁC -> DÙNG GOOGLE CLOUD TTS ---
    try {
      if (!ttsClient) throw new Error("Google TTS Client not initialized");

      const request = {
        input: { text },
        voice: { 
          languageCode: langCode, 
          ssmlGender: 'FEMALE' 
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      console.error("Google TTS Error:", error.message);
      throw error;
    }
  },

  /**
   * Lưu Buffer vào thư mục public của Server
   */
  saveLocal: async (buffer, fileName) => {
      // SỬA TẠI ĐÂY: Trỏ ra khỏi src/services và src/ để vào public ở gốc project
      const uploadDir = path.resolve(__dirname, '../../public/uploads/audio');

      console.log("📂 Đang kiểm tra thư mục:", uploadDir);

      if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log("📁 Đã tạo thư mục uploads/audio mới");
      }

      const filePath = path.join(uploadDir, fileName);
      
      // Sử dụng writeFileSync hoặc fs.promises.writeFile
      fs.writeFileSync(filePath, buffer);
      
      console.log(`✅ Đã lưu file vật lý tại: ${filePath}`);

      // Trả về path để lưu vào DB (đường dẫn URL)
      return `/uploads/audio/${fileName}`;
  },
  /**
   * Quy trình tạo audio guide trọn gói
   */
  generateAndSave: async (text, langCode, poiId) => {
    try {
      if (!text || text.trim().length === 0) return null;

      const shortLang = langCode.split('-')[0];
      // Thêm timestamp để trình duyệt không bị cache file cũ khi bạn nhấn Rebuild
      const fileName = `poi_${poiId}_${shortLang}_${Date.now()}.mp3`; 
      
      const buffer = await audioService.synthesize(text, langCode);
      const publicPath = await audioService.saveLocal(buffer, fileName);
      
      return publicPath; 
    } catch (error) {
      console.error("Audio Service Error:", error);
      throw error;
    }
  },

  /**
   * HÀM TEST ĐỂ IMPORT VÀO SERVER.JS
   */
  runTest: async () => {
    console.log("\x1b[36m%s\x1b[0m", "--- 🚀 STARTING TTS SERVICE TEST ---");
    try {
      console.log("1. Testing Vietnamese (FPT.AI)...");
      const pathVi = await audioService.generateAndSave("Chào mừng bạn đến với hệ thống Audio Guide.", "vi-VN", "test_vi");
      console.log("✅ VI Success:", pathVi);

      console.log("2. Testing English (Google TTS)...");
      const pathEn = await audioService.generateAndSave("Welcome to our Audio Guide system.", "en-US", "test_en");
      console.log("✅ EN Success:", pathEn);
    } catch (err) {
      console.error("\x1b[31m%s\x1b[0m", "❌ TEST FAILED:", err.message);
    }
    console.log("\x1b[36m%s\x1b[0m", "--- 🏁 TEST FINISHED ---");
  }
};

module.exports = audioService;