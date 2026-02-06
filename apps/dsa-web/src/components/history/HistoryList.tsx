import type React from 'react';
import { useRef, useCallback, useEffect, useState } from 'react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedQueryId?: string;
  onItemClick: (queryId: string) => void;
  onLoadMore: () => void;
  onDelete?: (queryId: string) => void;
  onReanalyze?: (stockCode: string) => void;
  className?: string;
}

/**
 * 历史记录列表组件
 * 显示最近的股票分析历史，支持点击查看详情和滚动加载更多
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedQueryId,
  onItemClick,
  onLoadMore,
  onDelete,
  onReanalyze,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // 使用 IntersectionObserver 检测滚动到底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      // 只有当触发器真正可见且有更多数据时才加载
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        // 确保容器有滚动能力（内容超过容器高度）
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: container,
      rootMargin: '20px', // 减小预加载距离
      threshold: 0.1, // 触发器至少 10% 可见时才触发
    });

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  const handleDelete = (e: React.MouseEvent, queryId: string) => {
    e.stopPropagation();
    if (onDelete && confirm('确定要删除这条记录吗？')) {
      onDelete(queryId);
    }
  };

  const handleReanalyze = (e: React.MouseEvent, stockCode: string) => {
    e.stopPropagation();
    if (onReanalyze) {
      onReanalyze(stockCode);
    }
  };

  return (
    <aside className={`glass-card overflow-hidden flex flex-col ${className}`}>
      <div ref={scrollContainerRef} className="p-3 flex-1 overflow-y-auto">
        <h2 className="text-xs font-medium text-purple uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          历史记录
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted text-xs">
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.queryId}
                className="relative"
                onMouseEnter={() => setHoveredItemId(item.queryId)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <button
                  type="button"
                  onClick={() => onItemClick(item.queryId)}
                  className={`history-item w-full text-left ${selectedQueryId === item.queryId ? 'active' : ''
                    }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {/* 情感分数指示条 */}
                    {item.sentimentScore !== undefined && (
                      <span
                        className="w-0.5 h-8 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: getSentimentColor(item.sentimentScore),
                          boxShadow: `0 0 6px ${getSentimentColor(item.sentimentScore)}40`
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-medium text-white truncate text-xs">
                          {item.stockName || item.stockCode}
                        </span>
                        {item.sentimentScore !== undefined && (
                          <span
                            className="text-xs font-mono font-semibold px-1 py-0.5 rounded"
                            style={{
                              color: getSentimentColor(item.sentimentScore),
                              backgroundColor: `${getSentimentColor(item.sentimentScore)}15`
                            }}
                          >
                            {item.sentimentScore}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted font-mono">
                          {item.stockCode}
                        </span>
                        <span className="text-xs text-muted/50">·</span>
                        <span className="text-xs text-muted">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* 操作按钮（悬停显示） */}
                {hoveredItemId === item.queryId && (onDelete || onReanalyze) && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 bg-card/90 backdrop-blur-sm rounded px-1 py-0.5">
                    {onReanalyze && (
                      <button
                        type="button"
                        onClick={(e) => handleReanalyze(e, item.stockCode)}
                        className="p-1 text-cyan hover:text-cyan-light hover:bg-cyan/10 rounded transition-colors"
                        title="重新分析"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.queryId)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="删除记录"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 加载更多触发器 */}
            <div ref={loadMoreTriggerRef} className="h-4" />

            {/* 加载更多状态 */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <div className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {/* 没有更多数据提示 */}
            {!hasMore && items.length > 0 && (
              <div className="text-center py-2 text-muted/50 text-xs">
                已加载全部
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
