# -*- coding: utf-8 -*-
"""
===================================
大盘分析接口
===================================

职责：
1. 提供 POST /api/v1/market/review 大盘复盘接口
"""

import logging
from fastapi import APIRouter

from api.v1.schemas.market import MarketReviewResponse
from src.config import get_config
from src.notification import NotificationService
from src.search_service import SearchService
from src.analyzer import GeminiAnalyzer
from src.core.market_review import run_market_review

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/review",
    response_model=MarketReviewResponse,
    summary="大盘复盘分析",
    description="执行当日大盘复盘分析"
)
def trigger_market_review() -> MarketReviewResponse:
    """
    触发大盘复盘分析
    
    Returns:
        MarketReviewResponse: 复盘结果
    """
    try:
        config = get_config()
        notifier = NotificationService()
        
        # 初始化搜索服务
        search_service = None
        if config.bocha_api_keys or config.tavily_api_keys or config.brave_api_keys or config.serpapi_keys:
            search_service = SearchService(
                bocha_keys=config.bocha_api_keys,
                tavily_keys=config.tavily_api_keys,
                brave_keys=config.brave_api_keys,
                serpapi_keys=config.serpapi_keys
            )
        
        # 初始化分析器 (优先级: Gemini > Anthropic > OpenAI)
        analyzer = None
        if config.gemini_api_key or config.anthropic_api_key or config.openai_api_key:
            analyzer = GeminiAnalyzer(api_key=config.gemini_api_key)
            if not analyzer.is_available():
                analyzer = None
        
        # 执行复盘（不发送通知，结果直接返回前端）
        report = run_market_review(
            notifier=notifier,
            analyzer=analyzer,
            search_service=search_service,
            send_notification=False
        )
        
        if report:
            return MarketReviewResponse(
                success=True,
                report=report,
                error=None
            )
        else:
            return MarketReviewResponse(
                success=False,
                report=None,
                error="复盘分析未生成报告"
            )
        
    except Exception as e:
        logger.error(f"大盘复盘失败: {e}", exc_info=True)
        return MarketReviewResponse(
            success=False,
            report=None,
            error=f"复盘失败: {str(e)}"
        )
