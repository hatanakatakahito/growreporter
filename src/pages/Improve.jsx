import React, { useState, useMemo, useEffect } from 'react';
import { useSite } from '../contexts/SiteContext';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Sparkles, Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { setPageTitle } from '../utils/pageTitle';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImprovementDialog from '../components/Improve/ImprovementDialog';
import AIGenerateDialog from '../components/Improve/AIGenerateDialog';
import EvaluationModal from '../components/Improve/EvaluationModal';

export default function Improve() {
  const { selectedSite, selectedSiteId } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('改善する');
  }, []);

  // URLパラメータからタスク追加を処理
  useEffect(() => {
    const action = searchParams.get('action');
    
    // AI提案からの一括タスク追加
    if (action === 'add-from-ai') {
      const tasksParam = searchParams.get('tasks');
      if (tasksParam && selectedSiteId) {
        try {
          const tasks = JSON.parse(decodeURIComponent(tasksParam));
          handleAddTasksFromAI(tasks);
        } catch (error) {
          console.error('[Improve] AI提案の解析エラー:', error);
        }
      }
      // URLパラメータをクリア
      setSearchParams({});
      return;
    }
    
    // 単一タスク追加（既存機能）
    if (action === 'add') {
      const title = searchParams.get('title');
      const description = searchParams.get('description');
      const category = searchParams.get('category');
      const priority = searchParams.get('priority');
      
      if (title) {
        // 編集アイテムを設定してダイアログを開く
        setEditingItem({
          title: decodeURIComponent(title),
          description: description ? decodeURIComponent(description) : '',
          category: category || 'other',
          priority: priority || 'medium',
          expectedImpact: '',
        });
        setIsDialogOpen(true);
        
        // URLパラメータをクリア
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams, selectedSiteId]);

  // 改善課題データの取得
  const { data: improvements = [], isLoading: improvementsLoading } = useQuery({
    queryKey: ['improvements', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      
      const q = query(
        collection(db, 'improvements'),
        where('siteId', '==', selectedSiteId),
        where('status', 'in', ['draft', 'in_progress', 'completed'])
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled: !!selectedSiteId,
  });

  // 更新mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const improvementRef = doc(db, 'improvements', id);
      await updateDoc(improvementRef, {
        ...data,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // 削除mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, 'improvements', id));
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // AI提案からの一括タスク追加
  const addTasksFromAIMutation = useMutation({
    mutationFn: async (tasks) => {
      const promises = tasks.map(task => {
        return addDoc(collection(db, 'improvements'), {
          siteId: selectedSiteId,
          title: task.title || task.recommendation || 'AI提案タスク',
          description: task.description || task.detail || '',
          category: task.category || 'other',
          priority: task.priority || 'medium',
          status: 'draft',
          expectedImpact: task.expectedImpact || '',
          order: Date.now(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'ai-analysis', // AI分析由来であることを記録
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      console.log('[Improve] AI提案からのタスク追加完了');
    },
  });

  const handleAddTasksFromAI = (tasks) => {
    if (!tasks || tasks.length === 0) return;
    console.log('[Improve] AI提案からタスク追加:', tasks);
    addTasksFromAIMutation.mutate(tasks);
  };

  const columns = [
    { id: 'draft', title: '起案', status: 'draft' },
    { id: 'in_progress', title: '対応中', status: 'in_progress' },
    { id: 'completed', title: '完了', status: 'completed' },
  ];

  const categoryColors = {
    acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
    feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };

  const categoryLabels = {
    acquisition: '集客',
    content: 'コンテンツ',
    design: 'デザイン',
    feature: '機能',
    other: 'その他',
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  };

  const priorityLabels = {
    high: '高',
    medium: '中',
    low: '低',
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const itemId = result.draggableId;
    const newStatus = result.destination.droppableId;

    const item = improvements.find(imp => imp.id === itemId);
    if (item && item.status !== newStatus) {
      const updateData = { status: newStatus };
      
      // 完了に移動した場合
      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString();
        
        // まず状態を更新
        updateMutation.mutate(
          { id: itemId, data: updateData },
          {
            onSuccess: () => {
              // 更新後に評価モーダルを表示
              setEvaluatingItem({ ...item, ...updateData });
              setIsEvaluationOpen(true);
            }
          }
        );
      } else {
        updateMutation.mutate({ id: itemId, data: updateData });
      }
    }
  };

  const handleEvaluationSave = (evaluationData) => {
    if (evaluatingItem) {
      updateMutation.mutate(
        { id: evaluatingItem.id, data: evaluationData },
        {
          onSuccess: () => {
            setIsEvaluationOpen(false);
            setEvaluatingItem(null);
          }
        }
      );
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('この改善課題を削除しますか？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const getItemsByStatus = (status) => {
    return improvements.filter(imp => imp.status === status);
  };

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={null}
          setDateRange={null}
          showDateRange={false}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
                改善する
              </h2>
              <p className="text-body-color">
                {selectedSite?.siteName} の改善課題を管理
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsGenerateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600"
              >
                <Sparkles className="h-4 w-4" />
                AI改善案生成
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsDialogOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                手動で追加
              </button>
            </div>
          </div>

          {improvementsLoading ? (
            <LoadingSpinner message="改善課題を読み込んでいます..." />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-3 gap-6">
                {columns.map((column) => (
                  <div key={column.id} className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-dark dark:text-white">{column.title}</h3>
                      <span className="rounded-full border border-stroke bg-gray-2 px-2 py-0.5 text-xs font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                        {getItemsByStatus(column.status).length}
                      </span>
                    </div>

                    <Droppable droppableId={column.status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[500px] space-y-3 rounded-lg p-2 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          {getItemsByStatus(column.status).map((item, index) => (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`rounded-lg border border-stroke bg-white p-4 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2 ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                >
                                  <div className="mb-3 flex items-start justify-between gap-2">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <h4 className="flex-1 text-sm font-medium text-dark dark:text-white">
                                      {item.title}
                                    </h4>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleEdit(item)}
                                        className="rounded p-1 hover:bg-gray-2 dark:hover:bg-dark-3"
                                      >
                                        <Edit className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item.id)}
                                        className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <p className="mb-3 line-clamp-2 text-xs text-body-color">
                                    {item.description}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-2">
                                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${categoryColors[item.category]}`}>
                                      {categoryLabels[item.category]}
                                    </span>
                                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityColors[item.priority]}`}>
                                      優先度: {priorityLabels[item.priority]}
                                    </span>
                                  </div>
                                  
                                  {item.expectedImpact && (
                                    <p className="mt-2 text-xs text-body-color">
                                      期待効果: {item.expectedImpact}
                                    </p>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </main>

      <AIGenerateDialog
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        siteId={selectedSiteId}
      />

      <ImprovementDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        siteId={selectedSiteId}
        editingItem={editingItem}
      />

      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => {
          setIsEvaluationOpen(false);
          setEvaluatingItem(null);
        }}
        item={evaluatingItem}
        onSave={handleEvaluationSave}
      />
    </>
  );
}

