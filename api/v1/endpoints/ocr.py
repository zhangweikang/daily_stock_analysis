# -*- coding: utf-8 -*-
"""
===================================
OCR 识别接口
===================================

职责：
1. 提供 POST /api/v1/ocr/recognize 图片识别接口
2. 调用 OCR 服务识别股票截图中的代码
"""

import logging
from fastapi import APIRouter, HTTPException

from api.v1.schemas.ocr import OcrRequest, OcrResponse
from src.ocr_service import get_ocr_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/recognize",
    response_model=OcrResponse,
    summary="识别股票截图中的代码",
    description="上传股票行情截图，自动识别其中的股票代码"
)
def recognize_stock_codes(request: OcrRequest) -> OcrResponse:
    """
    识别股票截图中的代码
    
    使用 AI Vision API（Gemini/Anthropic）识别截图中的股票代码
    
    Args:
        request: OCR 识别请求，包含 base64 图片数据
        
    Returns:
        OcrResponse: 识别结果
    """
    try:
        ocr_service = get_ocr_service()
        
        # 检查服务是否可用
        if not ocr_service.is_available():
            return OcrResponse(
                success=False,
                codes=[],
                count=0,
                provider=None,
                error="OCR 服务未配置，请设置 GEMINI_API_KEY 或 ANTHROPIC_API_KEY"
            )
        
        # 执行识别
        codes, error = ocr_service.recognize_from_base64(
            image_base64=request.image_base64,
            mime_type=request.mime_type
        )
        
        if error:
            return OcrResponse(
                success=False,
                codes=[],
                count=0,
                provider=ocr_service.get_provider(),
                error=error
            )
        
        return OcrResponse(
            success=True,
            codes=codes,
            count=len(codes),
            provider=ocr_service.get_provider(),
            error=None
        )
        
    except Exception as e:
        logger.error(f"OCR 识别失败: {e}", exc_info=True)
        return OcrResponse(
            success=False,
            codes=[],
            count=0,
            provider=None,
            error=f"识别过程发生错误: {str(e)}"
        )
