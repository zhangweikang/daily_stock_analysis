# -*- coding: utf-8 -*-
"""
===================================
OCR 识别相关 Schema
===================================

定义 OCR 接口的请求和响应模型
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class OcrRequest(BaseModel):
    """OCR 识别请求"""
    image_base64: str = Field(..., description="Base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）")
    mime_type: str = Field(default="image/png", description="图片 MIME 类型")


class OcrResponse(BaseModel):
    """OCR 识别响应"""
    success: bool = Field(..., description="是否识别成功")
    codes: List[str] = Field(default_factory=list, description="识别到的股票代码列表")
    count: int = Field(default=0, description="识别到的代码数量")
    provider: Optional[str] = Field(None, description="使用的 OCR 提供商（gemini/anthropic）")
    error: Optional[str] = Field(None, description="错误信息")
