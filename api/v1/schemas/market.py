# -*- coding: utf-8 -*-
"""
===================================
大盘分析相关 Schema
===================================
"""

from typing import Optional
from pydantic import BaseModel, Field


class MarketReviewResponse(BaseModel):
    """大盘复盘响应"""
    success: bool = Field(..., description="是否成功")
    report: Optional[str] = Field(None, description="复盘报告内容")
    error: Optional[str] = Field(None, description="错误信息")
