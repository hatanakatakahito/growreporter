import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Zap, Shield, MousePointerClick } from 'lucide-react';

const ACTIONS = [
  {
    icon: BarChart3,
    title: 'AIで分析する',
    description: 'GA4データをAIが自動分析',
    path: '/analysis/summary',
    state: { scrollToAI: true },
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Zap,
    title: '改善案を生成',
    description: 'AIが改善施策を提案',
    path: '/improve',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'サイト診断',
    description: 'パフォーマンスを総合診断',
    path: '/analysis/site-diagnosis',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: MousePointerClick,
    title: 'ヒートマップ',
    description: 'クリック・スクロールを可視化',
    path: '/analysis/heatmap',
    color: 'bg-primary/10 text-primary',
  },
];

/**
 * クイックアクション
 */
export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.path}
            to={action.path}
            state={action.state}
            className="group flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center shadow-sm transition-all hover:shadow-md dark:border-dark-3 dark:bg-dark-2"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.color} transition-transform group-hover:scale-110`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-dark dark:text-white">{action.title}</span>
            <span className="text-xs text-body-color">{action.description}</span>
          </Link>
        );
      })}
    </div>
  );
}
