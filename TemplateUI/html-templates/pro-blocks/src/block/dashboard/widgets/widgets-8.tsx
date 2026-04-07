import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import { Checkbox } from '@/components/core/checkbox';
import { MenuKebab1 } from '@tailgrids/icons';
import { useState } from 'react';

const scheduleItems = [
  {
    id: 1,
    date: 'Wed, 11 Jan',
    time: '09:20 AM',
    title: 'Business Analytics Press',
    description: 'Exploring the Future of Data-Driven +6 more',
  },
  {
    id: 2,
    date: 'Fri, 15 Feb',
    time: '10:35 AM',
    title: 'Business Sprint',
    description: 'Techniques from Business Sprint +2 more',
  },
  {
    id: 3,
    date: 'Thu, 18 Mar',
    time: '1:15 AM',
    title: 'Customer Review Meeting',
    description: 'Insights from the Customer Review Meeting +8 more',
  },
];

export default function Widgets8() {
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-2xl rounded-2xl border p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-title-50 text-lg font-semibold">
            Upcoming Schedule
          </h3>

          <div className="relative inline-block">
            <DropdownMenu>
              <DropdownMenuTrigger className="dropdown-toggle">
                <MenuKebab1 />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                placement="bottom end"
                className="bg-background-50 border-base-100 w-40 rounded-xl border p-1"
              >
                <DropdownMenuItem className="text-text-100 hover:bg-background-soft-100 hover:text-text-50 flex w-full cursor-pointer rounded-lg text-left text-sm font-normal">
                  View More
                </DropdownMenuItem>
                <DropdownMenuItem className="text-text-100 hover:bg-background-soft-100 hover:text-text-50 flex w-full cursor-pointer rounded-lg text-left text-sm font-normal">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="custom-scrollbar w-full max-w-full overflow-x-auto">
          <div className="lg:min-w-[500px] xl:min-w-full">
            <div className="flex flex-col gap-2">
              {scheduleItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="hover:bg-background-soft-50 flex cursor-pointer flex-col justify-between gap-5 rounded-lg p-3 sm:flex-row sm:items-center sm:gap-9"
                >
                  <div className="flex flex-col items-start gap-3 sm:flex-row">
                    <Checkbox
                      size="md"
                      checked={checkedItems.includes(item.id)}
                      onChange={() => {}}
                      className="w-fit"
                    />
                    <div className="w-full">
                      <span className="text-theme-xs text-text-100 mb-0.5 block">
                        {item.date}
                      </span>
                      <span className="text-theme-sm text-text-50 font-medium">
                        {item.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-theme-sm text-text-50 mb-1 block font-medium">
                      {item.title}
                    </span>
                    <span className="text-theme-xs text-text-100">
                      {item.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
