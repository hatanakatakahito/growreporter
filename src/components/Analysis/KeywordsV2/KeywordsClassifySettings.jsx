import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Sparkles } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Button } from '../../ui/button';
import toast from 'react-hot-toast';

/**
 * AI 分類精度向上のための設定モーダル
 *  - ブランド名語: AI が「指名検索」と判定する候補語のヒント
 *  - 除外語: AI が「無関係」と判定すべき明示語（誤流入として扱う）
 * 保存先: sites/{siteId}.brandKeywords / .excludeKeywords
 * 保存後は再分類フローを呼び出すよう親で onSaved コールバックを使う
 */
export default function KeywordsClassifySettings({ siteId, isOpen, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brandText, setBrandText] = useState('');
  const [excludeText, setExcludeText] = useState('');

  useEffect(() => {
    if (!isOpen || !siteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'sites', siteId));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          setBrandText((d.brandKeywords || []).join('\n'));
          setExcludeText((d.excludeKeywords || []).join('\n'));
        }
      } catch (e) {
        console.error('[KeywordsClassifySettings] load failed:', e);
        toast.error('設定の読み込みに失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, siteId]);

  // ESC キーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const parseLines = (text) =>
    Array.from(
      new Set(
        text
          .split(/[\n,、，]/)
          .map((l) => l.trim())
          .filter(Boolean)
      )
    ).slice(0, 50); // 最大 50 件

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const brandKeywords = parseLines(brandText);
      const excludeKeywords = parseLines(excludeText);
      await updateDoc(doc(db, 'sites', siteId), {
        brandKeywords,
        excludeKeywords,
      });
      toast.success(`保存しました（ブランド ${brandKeywords.length}語 / 除外 ${excludeKeywords.length}語）`);
      onSaved?.({ brandKeywords, excludeKeywords });
      onClose();
    } catch (e) {
      console.error('[KeywordsClassifySettings] save failed:', e);
      toast.error('保存に失敗しました: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-dark-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-dark dark:text-white">AI 分類設定</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-body-color hover:bg-gray-100 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-body-color">
            AI 分類の精度を上げるためのヒントを登録できます。保存後に「再分類」を実行すると新しい設定で分類し直されます。
          </p>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-1">
                  ブランド名・指名検索対象語
                </label>
                <p className="text-xs text-body-color mb-2">
                  サイト名・ブランド名・社名・サービス名など、自社を指す検索語を 1 行に 1 つ入力。AI が「指名検索」と判定するヒントになります（最大 50 件）
                </p>
                <textarea
                  value={brandText}
                  onChange={(e) => setBrandText(e.target.value)}
                  rows={5}
                  placeholder="例:&#10;Grow Group&#10;グローグループ&#10;growgroup"
                  className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white dark:bg-dark-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-1">
                  除外語（無関係扱いにするキーワード）
                </label>
                <p className="text-xs text-body-color mb-2">
                  サイトの業種と関係ない、誤流入扱いにしたい語を 1 行に 1 つ入力。AI 分類前に「無関係」へ強制振り分けされます（最大 50 件）
                </p>
                <textarea
                  value={excludeText}
                  onChange={(e) => setExcludeText(e.target.value)}
                  rows={5}
                  placeholder="例:&#10;excel 関数&#10;転職エージェント&#10;react 入門"
                  className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white dark:bg-dark-3"
                />
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 space-y-1">
                <div><strong>ヒント:</strong> 入力したキーワードは AI への前提情報として渡されます。完全一致だけでなく、AI が文脈を読んで類似語も判定します。</div>
                <div><strong>表記ゆれ自動吸収:</strong> 大文字 / 小文字、スペースの有無は自動的に同一視されます。「Grow Group」と「growgroup」は同じ扱いです。</div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-dark-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" data-slot="icon" />
                <span>保存して再分類</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
