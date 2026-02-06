# -*- coding: utf-8 -*-
"""
股票截图 OCR 识别服务

支持：
1. Gemini Vision API（优先）
2. Claude Vision API（备选）

从股票行情截图中自动识别股票代码
"""

import base64
import re
import logging
from typing import List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class StockOCRService:
    """
    股票截图 OCR 识别服务

    使用 AI 视觉模型识别截图中的股票代码
    """

    # 识别提示词
    OCR_PROMPT = """请仔细分析这张股票行情截图，提取所有可见的股票代码。

要求：
1. 只提取6位数字的股票代码（如：600519、000001、002594、300750）
2. 忽略其他数字（如价格、涨跌幅、成交量等）
3. A股代码规则：
   - 沪市主板：600xxx, 601xxx, 603xxx, 605xxx
   - 深市主板：000xxx, 001xxx
   - 中小板：002xxx
   - 创业板：300xxx, 301xxx
   - 科创板：688xxx, 689xxx
   - 北交所：8xxxxx, 4xxxxx
4. 港股代码：5位数字（如：00700、09988）
5. 美股代码：字母组合（如：AAPL、TSLA）

请按以下 JSON 格式返回结果（只返回JSON，不要其他内容）：
{
    "codes": ["600519", "000001", "002594"],
    "count": 3
}

如果没有识别到任何股票代码，返回：
{
    "codes": [],
    "count": 0
}
"""

    def __init__(self):
        """初始化 OCR 服务"""
        self._gemini_client = None
        self._anthropic_client = None
        self._provider = None  # 当前使用的提供商
        self._init_clients()

    def _init_clients(self) -> None:
        """初始化 AI 客户端"""
        from src.config import get_config
        config = get_config()

        # 优先尝试 Gemini
        if config.gemini_api_key and not config.gemini_api_key.startswith('your_'):
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.gemini_api_key)
                # 使用支持视觉的模型
                self._gemini_client = genai.GenerativeModel('gemini-2.0-flash')
                self._provider = 'gemini'
                logger.info("OCR 服务使用 Gemini Vision API")
                return
            except Exception as e:
                logger.warning(f"Gemini Vision 初始化失败: {e}")

        # 备选 Anthropic Claude
        if config.anthropic_api_key and not config.anthropic_api_key.startswith('your_'):
            try:
                from anthropic import Anthropic
                client_kwargs = {"api_key": config.anthropic_api_key}
                if config.anthropic_base_url:
                    client_kwargs["base_url"] = config.anthropic_base_url
                self._anthropic_client = Anthropic(**client_kwargs)
                self._provider = 'anthropic'
                logger.info(f"OCR 服务使用 Anthropic Vision API (model: {config.anthropic_model})")
                return
            except Exception as e:
                logger.warning(f"Anthropic Vision 初始化失败: {e}")

        logger.warning("未配置可用的 Vision API，OCR 功能将不可用")

    def is_available(self) -> bool:
        """检查 OCR 服务是否可用"""
        return self._provider is not None

    def get_provider(self) -> Optional[str]:
        """获取当前使用的提供商"""
        return self._provider

    def recognize_from_base64(self, image_base64: str, mime_type: str = "image/png") -> Tuple[List[str], str]:
        """
        从 Base64 编码的图片中识别股票代码

        Args:
            image_base64: Base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）
            mime_type: 图片 MIME 类型

        Returns:
            (股票代码列表, 错误信息)
        """
        if not self.is_available():
            return [], "OCR 服务未配置，请设置 GEMINI_API_KEY 或 ANTHROPIC_API_KEY"

        try:
            if self._provider == 'gemini':
                return self._recognize_with_gemini(image_base64, mime_type)
            elif self._provider == 'anthropic':
                return self._recognize_with_anthropic(image_base64, mime_type)
            else:
                return [], "未知的 OCR 提供商"
        except Exception as e:
            logger.error(f"OCR 识别失败: {e}")
            return [], f"识别失败: {str(e)}"

    def recognize_from_file(self, file_path: str) -> Tuple[List[str], str]:
        """
        从图片文件中识别股票代码

        Args:
            file_path: 图片文件路径

        Returns:
            (股票代码列表, 错误信息)
        """
        path = Path(file_path)
        if not path.exists():
            return [], f"文件不存在: {file_path}"

        # 读取并编码
        with open(path, 'rb') as f:
            image_data = f.read()

        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # 判断 MIME 类型
        suffix = path.suffix.lower()
        mime_map = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        }
        mime_type = mime_map.get(suffix, 'image/png')

        return self.recognize_from_base64(image_base64, mime_type)

    def _recognize_with_gemini(self, image_base64: str, mime_type: str) -> Tuple[List[str], str]:
        """使用 Gemini Vision 识别"""
        import json

        # 构建图片内容
        image_part = {
            "mime_type": mime_type,
            "data": image_base64
        }

        # 调用 Gemini
        response = self._gemini_client.generate_content(
            [self.OCR_PROMPT, image_part],
            generation_config={
                "temperature": 0.1,  # 低温度确保准确性
                "max_output_tokens": 1024,
            }
        )

        if not response or not response.text:
            return [], "Gemini 返回空响应"

        # 解析结果
        return self._parse_response(response.text)

    def _recognize_with_anthropic(self, image_base64: str, mime_type: str) -> Tuple[List[str], str]:
        """使用 Anthropic Claude Vision 识别"""
        from src.config import get_config
        config = get_config()

        # 构建消息
        response = self._anthropic_client.messages.create(
            model=config.anthropic_model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_base64,
                            }
                        },
                        {
                            "type": "text",
                            "text": self.OCR_PROMPT
                        }
                    ]
                }
            ],
            temperature=0.1,
        )

        if not response or not response.content:
            return [], "Anthropic 返回空响应"

        # 提取文本
        text_content = ""
        for block in response.content:
            if hasattr(block, 'text'):
                text_content += block.text

        if not text_content:
            return [], "Anthropic 返回空文本"

        return self._parse_response(text_content)

    def _parse_response(self, response_text: str) -> Tuple[List[str], str]:
        """解析 AI 响应，提取股票代码"""
        import json

        # 尝试解析 JSON
        try:
            # 清理响应文本，提取 JSON 部分
            json_match = re.search(r'\{[^{}]*"codes"[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                result = json.loads(json_str)
                codes = result.get('codes', [])
                if codes:
                    # 验证和清理代码
                    valid_codes = self._validate_codes(codes)
                    logger.info(f"OCR 识别到 {len(valid_codes)} 个股票代码: {valid_codes}")
                    return valid_codes, ""
        except json.JSONDecodeError:
            pass

        # JSON 解析失败，尝试正则提取
        codes = self._extract_codes_by_regex(response_text)
        if codes:
            logger.info(f"OCR 正则提取到 {len(codes)} 个股票代码: {codes}")
            return codes, ""

        return [], "未能识别到有效的股票代码"

    def _validate_codes(self, codes: List[str]) -> List[str]:
        """验证并清理股票代码"""
        valid_codes = []
        seen = set()

        for code in codes:
            code = str(code).strip()

            # 跳过重复
            if code in seen:
                continue

            # 验证格式
            if self._is_valid_code(code):
                valid_codes.append(code)
                seen.add(code)

        return valid_codes

    def _is_valid_code(self, code: str) -> bool:
        """检查是否为有效的股票代码"""
        # A股：6位数字
        if re.match(r'^[0-9]{6}$', code):
            prefix = code[:3]
            # 有效前缀
            valid_prefixes = [
                '600', '601', '603', '605',  # 沪市主板
                '000', '001', '002',          # 深市主板/中小板
                '300', '301',                 # 创业板
                '688', '689',                 # 科创板
                '830', '831', '832', '833',   # 北交所
                '430', '420',                 # 新三板
            ]
            return any(code.startswith(p) for p in valid_prefixes)

        # 港股：5位数字
        if re.match(r'^[0-9]{5}$', code):
            return True

        # 美股：1-5位字母
        if re.match(r'^[A-Z]{1,5}$', code.upper()):
            return True

        return False

    def _extract_codes_by_regex(self, text: str) -> List[str]:
        """使用正则表达式从文本中提取股票代码"""
        codes = []
        seen = set()

        # 匹配6位数字（A股）
        for match in re.finditer(r'\b([0-9]{6})\b', text):
            code = match.group(1)
            if code not in seen and self._is_valid_code(code):
                codes.append(code)
                seen.add(code)

        # 匹配5位数字（港股）
        for match in re.finditer(r'\b([0-9]{5})\b', text):
            code = match.group(1)
            if code not in seen and self._is_valid_code(code):
                codes.append(code)
                seen.add(code)

        return codes


# 单例实例
_ocr_service: Optional[StockOCRService] = None


def get_ocr_service() -> StockOCRService:
    """获取 OCR 服务单例"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = StockOCRService()
    return _ocr_service