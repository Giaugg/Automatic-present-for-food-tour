const { Translate } = require('@google-cloud/translate').v2;
const path = require('path');

// Khởi tạo với file credentials
const translate = new Translate({
  keyFilename: path.join(__dirname, 'service_account.json')
});

const translationService = {
  /**
   * Dịch một hoặc nhiều chuỗi văn bản cùng lúc
   * @param {string|string[]} text - Văn bản cần dịch
   * @param {string} targetLangCode - Mã ngôn ngữ đích (vi-VN, en-US,...)
   */
  async translateText(text, targetLangCode) {
    try {
      // 1. Chuẩn hóa mã ngôn ngữ (en-US -> en)
      const target = targetLangCode.split('-')[0];
      
      // Nếu là tiếng Việt rồi thì không dịch nữa
      if (target === 'vi') return text;

      // 2. Gọi API (Google hỗ trợ truyền mảng để dịch hàng loạt)
      const [translations] = await translate.translate(text, target);
      
      return translations;
    } catch (error) {
      console.error(`❌ Translation Error [${targetLangCode}]:`, error.message);
      // Trả về bản gốc nếu lỗi để tránh mất dữ liệu trên giao diện
      return text; 
    }
  },

  /**
   * Logic dành riêng cho POI: Dịch cả Name và Description của một bản dịch gốc
   */
  async translatePoi(originalTranslation, targetLangCode) {
    const { name, description } = originalTranslation;
    
    // Dịch cả 2 trong 1 request duy nhất để tối ưu
    const [translatedName, translatedDesc] = await this.translateText(
      [name, description], 
      targetLangCode
    );

    return {
      language_code: targetLangCode,
      name: translatedName,
      description: translatedDesc
    };
  }
};

module.exports = translationService;