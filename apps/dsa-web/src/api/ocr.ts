import apiClient from './index';
import { toCamelCase } from './utils';

export interface OcrRecognizeResponse {
  success: boolean;
  codes: string[];
  count: number;
  provider: string | null;
  error: string | null;
}

export const ocrApi = {
  /**
   * 识别股票截图中的代码
   * @param imageBase64 Base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）
   * @param mimeType 图片 MIME 类型
   * @returns 识别结果
   */
  recognize: async (imageBase64: string, mimeType: string = 'image/png'): Promise<OcrRecognizeResponse> => {
    const response = await apiClient.post<Record<string, unknown>>(
      '/api/v1/ocr/recognize',
      {
        image_base64: imageBase64,
        mime_type: mimeType,
      }
    );
    return toCamelCase<OcrRecognizeResponse>(response.data);
  },
};
