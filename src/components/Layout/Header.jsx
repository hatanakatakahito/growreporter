import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '../ui/dropdown';

export default function Header({ title, subtitle, backLink, backLabel, action, showSiteSelector = false }) {
  const { sites, selectedSite, selectSite } = useSite();
  const navigate = useNavigate();

  return (
    <div className="border-b border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      <div className="flex h-20 items-center px-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-dark dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <span className="text-sm text-body-color">
                {subtitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* サイト選択ドロップダウン */}
            {showSiteSelector && sites.length > 0 && (
              <Dropdown>
                <DropdownButton
                  as="button"
                  className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2.5 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
                >
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="whitespace-nowrap text-sm font-medium text-dark dark:text-white">
                    {selectedSite?.siteName || 'サイトを選択'}
                  </span>
                  <svg className="h-4 w-4 text-body-color" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </DropdownButton>

                <DropdownMenu anchor="bottom start" className="min-w-64">
                  {sites.map((site) => (
                    <DropdownItem
                      key={site.id}
                      onClick={() => {
                        selectSite(site.id);
                        navigate(`/dashboard?siteId=${site.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {selectedSite?.id === site.id && (
                          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{site.siteName}</div>
                          <div className="truncate text-xs text-body-color">{site.siteUrl}</div>
                        </div>
                      </div>
                    </DropdownItem>
                  ))}
                  <DropdownDivider />
                  <DropdownItem onClick={() => navigate('/sites/new')}>
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-primary">新規サイト登録</span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}

            {backLink && (
              <Link
                to={backLink}
                className="rounded-md border border-stroke px-6 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                {backLabel || '戻る'}
              </Link>
            )}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
