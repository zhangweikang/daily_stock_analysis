import apiClient from './index';
import { toCamelCase } from './utils';

export interface MarketReviewResponse {
  success: boolean;
  report: string | null;
  error: string | null;
}

export const marketApi = {
  /**
   * 执行大盘复盘分析
   * @returns 复盘结果
   */
  review: async (): Promise<MarketReviewResponse> => {
    const response = await apiClient.post<Record<string, unknown>>(
      '/api/v1/market/review'
    );
    return toCamelCase<MarketReviewResponse>(response.data);
  },
};
