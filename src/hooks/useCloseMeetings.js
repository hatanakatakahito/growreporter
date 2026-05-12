import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * クローズミーティング記録（GrowGroup 社内用）の CRUD フック
 * すべて Cloud Functions callable 経由（@grow-group.jp スタッフのみ・canAccessSite で二重チェック）
 */

function call(name, payload) {
  return httpsCallable(functions, name)(payload).then((r) => r.data);
}

/** サイトのリニューアル記録一覧（新しい順） */
export function useCloseMeetingsList(siteId) {
  return useQuery({
    queryKey: ['close-meetings', siteId],
    queryFn: async () => {
      const data = await call('listCloseMeetings', { siteId });
      return data?.records || [];
    },
    enabled: !!siteId,
    staleTime: 60 * 1000,
  });
}

/** 記録1件 */
export function useCloseMeeting(recordId) {
  return useQuery({
    queryKey: ['close-meeting', recordId],
    queryFn: async () => {
      const data = await call('getCloseMeeting', { recordId });
      return data?.record || null;
    },
    enabled: !!recordId,
    staleTime: 30 * 1000,
  });
}

/** 新規作成（公開日のみ入力） */
export function useCreateCloseMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ siteId, launchDate }) => {
      const data = await call('createCloseMeeting', { siteId, launchDate });
      return data?.record;
    },
    onSuccess: (record) => {
      if (!record) return;
      qc.setQueryData(['close-meeting', record.id], record);
      qc.invalidateQueries({ queryKey: ['close-meetings', record.siteId] });
    },
  });
}

/** 記録更新（label / meetingDate / launchDate / comparison / observationRange / consultantNotes） */
export function useUpdateCloseMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, patch }) => {
      const data = await call('updateCloseMeeting', { recordId, patch });
      return data?.record;
    },
    onSuccess: (record) => {
      if (!record) return;
      qc.setQueryData(['close-meeting', record.id], record);
      qc.invalidateQueries({ queryKey: ['close-meetings', record.siteId] });
    },
  });
}

/** 記録削除（下書きのみ） */
export function useDeleteCloseMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId }) => {
      const data = await call('deleteCloseMeeting', { recordId });
      return data;
    },
    onSuccess: (data, vars) => {
      qc.removeQueries({ queryKey: ['close-meeting', vars.recordId] });
      if (data?.siteId) qc.invalidateQueries({ queryKey: ['close-meetings', data.siteId] });
    },
  });
}

/** AI 総括の生成（保存はしない。結果は呼び出し側で state に保持） */
export function useGenerateCloseMeetingSummary() {
  return useMutation({
    mutationFn: async ({ recordId, payload }) => {
      const data = await call('generateCloseMeetingSummary', { recordId, payload });
      return data?.aiSummary || null;
    },
  });
}

/** 確定保存（snapshot ＋ aiSummary を記録に焼き込み、status:'finalized'） */
export function useFinalizeCloseMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, snapshot, aiSummary }) => {
      const data = await call('finalizeCloseMeetingReport', { recordId, snapshot, aiSummary });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['close-meeting', vars.recordId] });
      qc.invalidateQueries({ queryKey: ['close-meetings'] });
    },
  });
}

/** 共有リンクの発行 / 無効化 / 再発行（action: 'create' | 'revoke' | 'regenerate'） */
export function useManageCloseMeetingShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, action }) => {
      const data = await call('manageCloseMeetingShareLink', { recordId, action });
      return data?.share || null;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['close-meeting', vars.recordId] });
    },
  });
}
