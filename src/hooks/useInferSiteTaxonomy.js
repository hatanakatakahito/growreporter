import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * URL からタクソノミー V2（ビジネスモデル・業種大/小・サイト役割）を
 * Gemini で自動推定する Callable `inferSiteTaxonomy` のラッパー。
 *
 * 呼び出し側:
 *   const { mutateAsync, isPending } = useInferSiteTaxonomy();
 *   const result = await mutateAsync({ siteUrl, siteName, siteId? });
 *   // result = { businessModel, industryMajor, industryMinor, siteRole,
 *   //            confidence, reasoning, needsManualReclassify }
 *
 * confidence が 'low' の場合は呼び出し側で needsManualReclassify=true を設定することを推奨。
 */
export function useInferSiteTaxonomy() {
  return useMutation({
    mutationFn: async ({ siteUrl, siteName = '', siteId = '' }) => {
      if (!siteUrl) throw new Error('サイトURLが必要です');
      const callable = httpsCallable(functions, 'inferSiteTaxonomy', { timeout: 120_000 });
      const result = await callable({ siteUrl, siteName, siteId });
      return result.data;
    },
  });
}
