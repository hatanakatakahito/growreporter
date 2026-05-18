import React, { useMemo } from 'react';
import { Info } from 'lucide-react';

const LAYER_LABELS_JA = {
  branded: '指名',
  pureIntent: '純顕在',
  intent: '顕在',
  latent: '潜在',
  noise: '無関係',
};

/**
 * CV 貢献キーワード ランキング
 *  KW のクリック × LP の CV 率 × LP のセッション ÷ KW のクリック数 で推定
 *  バックエンドが estimatedCV を計算済みなのでそれを降順で表示
 */
export default function KeywordsCVContribution({ data }) {
  const keywords = data?.keywords || [];

  const ranked = useMemo(() => {
    return [...keywords]
      .filter((k) => k.estimatedCV > 0)
      .sort((a, b) => b.estimatedCV - a.estimatedCV)
      .slice(0, 20);
  }, [keywords]);

  const max = ranked[0]?.estimatedCV || 1;

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-1">CV 貢献キーワード ランキング</h3>
        <p className="text-xs text-body-color">
          「KW → LP → CV」のジャーニーパスから推定。実際の CV 数 × 該当 KW のクリック比率で算出
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-8 text-sm text-body-color space-y-2">
          {!data?.ga4Enabled ? (
            <div>
              <div className="font-semibold text-dark dark:text-white mb-1">GA4 が連携されていません</div>
              <div>CV 貢献スコアを算出するには GA4 連携が必要です</div>
            </div>
          ) : !data?.metrics?.estimatedCV || data?.metrics?.estimatedCV === 0 ? (
            <div>
              <div className="font-semibold text-dark dark:text-white mb-1">対象期間に CV が発生していません</div>
              <div>選択中の期間でコンバージョンが 0 件のため、寄与スコアを算出できません</div>
            </div>
          ) : (
            <div>該当する CV 貢献キーワードがありません</div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((kw, idx) => {
            const widthPct = Math.max(5, Math.round((kw.estimatedCV / max) * 100));
            const isTop = idx === 0;
            return (
              <div
                key={kw.query}
                className={`flex items-center gap-3 rounded-md p-3 ${
                  isTop ? 'bg-emerald-50/40 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-700' : 'hover:bg-slate-50 dark:hover:bg-dark-3'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-sm shrink-0 ${
                    isTop ? 'bg-emerald-500' : idx < 3 ? 'bg-slate-400' : 'bg-slate-300'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-dark dark:text-white truncate">{kw.query}</div>
                  <div className="text-xs text-body-color">
                    <span className="rounded bg-slate-100 dark:bg-dark-3 px-1.5 py-0.5 mr-2">
                      {LAYER_LABELS_JA[kw.layer] || kw.layer}
                    </span>
                    経由 LP: <span className="font-mono text-primary">{kw.topPage || '-'}</span>
                  </div>
                </div>
                <div className="w-48 hidden md:block">
                  <div className="h-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
                <div className="w-20 text-right shrink-0">
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{kw.estimatedCV}</div>
                  <div className="text-[10px] text-body-color">推定 CV</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
        <Info className="inline h-3.5 w-3.5 mr-1" />
        <span className="font-semibold">補足:</span> CV 貢献スコアは GA4 のセッション CV と GSC のクリックを掛け合わせた推定値。実際の自社管理画面の CV 数とは多少誤差があります
      </div>
    </div>
  );
}
