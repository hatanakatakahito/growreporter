/**
 * コンバージョン定義を取得するためのReactフック
 */

import { useState, useEffect } from 'react';
import { ConversionService, ConversionEvent } from './conversionService';

/**
 * コンバージョン設定を取得するカスタムフック
 */
export function useConversions(userId: string | undefined) {
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchConversions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await ConversionService.getConversions(userId);
        setConversions(data);
      } catch (err: any) {
        console.error('コンバージョン取得エラー:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversions();
  }, [userId]);

  return { conversions, isLoading, error };
}

/**
 * アクティブなコンバージョンのみを取得するカスタムフック
 */
export function useActiveConversions(userId: string | undefined) {
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchActiveConversions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await ConversionService.getActiveConversions(userId);
        setConversions(data);
      } catch (err: any) {
        console.error('アクティブなコンバージョン取得エラー:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveConversions();
  }, [userId]);

  return { conversions, isLoading, error };
}

