import type React from 'react';
import { useState, useCallback } from 'react';

interface StockCodeManagerProps {
  codes: string[];
  onCodesChange: (codes: string[]) => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
}

/**
 * 股票代码管理组件
 * 支持查看、编辑、删除、新增股票代码
 */
const StockCodeManager: React.FC<StockCodeManagerProps> = ({
  codes,
  onCodesChange,
  onAnalyze,
  isAnalyzing = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCode, setNewCode] = useState('');

  // 删除代码
  const handleDelete = useCallback((index: number) => {
    const newCodes = codes.filter((_, i) => i !== index);
    onCodesChange(newCodes);
  }, [codes, onCodesChange]);

  // 开始编辑
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(codes[index]);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const trimmed = editValue.trim().toUpperCase();
    if (trimmed && !codes.includes(trimmed)) {
      const newCodes = [...codes];
      newCodes[editingIndex] = trimmed;
      onCodesChange(newCodes);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  // 新增代码
  const handleAddCode = () => {
    const trimmed = newCode.trim().toUpperCase();
    if (trimmed && !codes.includes(trimmed)) {
      onCodesChange([...codes, trimmed]);
    }
    setNewCode('');
  };

  // 清空所有
  const handleClearAll = () => {
    onCodesChange([]);
  };

  // 键盘事件
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCode();
    }
  };

  if (codes.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {/* 代码标签列表 */}
      <div className="flex flex-wrap gap-1.5">
        {codes.map((code, index) => (
          <div
            key={`${code}-${index}`}
            className="group flex items-center gap-1 px-2 py-1 bg-elevated rounded text-sm"
          >
            {editingIndex === index ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                onKeyDown={handleEditKeyDown}
                onBlur={handleSaveEdit}
                className="w-20 bg-transparent border-b border-cyan outline-none text-white"
                autoFocus
              />
            ) : (
              <span
                className="text-white cursor-pointer hover:text-cyan"
                onClick={() => handleStartEdit(index)}
                title="点击编辑"
              >
                {code}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(index)}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity"
              title="删除"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {/* 新增输入框 */}
        <div className="flex items-center gap-1 px-2 py-1 bg-elevated/50 rounded text-sm border border-dashed border-white/20">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            onKeyDown={handleAddKeyDown}
            placeholder="新增"
            className="w-16 bg-transparent outline-none text-white placeholder-muted text-xs"
          />
          {newCode && (
            <button
              type="button"
              onClick={handleAddCode}
              className="text-cyan hover:text-cyan/80"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing || codes.length === 0}
          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
        >
          {isAnalyzing ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              分析中
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              批量分析 ({codes.length})
            </>
          )}
        </button>
        
        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs text-muted hover:text-danger transition-colors"
        >
          清空
        </button>
        
        <span className="text-xs text-muted ml-auto">
          共 {codes.length} 个代码
        </span>
      </div>
    </div>
  );
};

export default StockCodeManager;
