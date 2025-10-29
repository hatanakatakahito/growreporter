import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ 
  children, 
  title, 
  subtitle, 
  backLink, 
  backLabel,
  action 
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
        {/* ヘッダー */}
        {title && (
          <Header 
            title={title} 
            subtitle={subtitle} 
            backLink={backLink}
            backLabel={backLabel}
            action={action}
          />
        )}

        {/* コンテンツエリア */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

