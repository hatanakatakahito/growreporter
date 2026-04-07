import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/core/dropdown';
import { MenuKebab1 } from '@tailgrids/icons';

type WatchlistItemProps = {
  symbol: string;
  companyName: string;
  price: string;
  change: string;
  changeDirection: 'up' | 'down'; // Determines icon and color
  brandImage: string; // Path to the brand image
};

const watchlistData: WatchlistItemProps[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple, Inc',
    price: '$4,008.65',
    change: '11.01%',
    changeDirection: 'up',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/apple.svg',
  },
  {
    symbol: 'SPOT',
    companyName: 'Spotify.com',
    price: '$11,689.00',
    change: '9.48%',
    changeDirection: 'up',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/spotify.svg',
  },
  {
    symbol: 'ABNB',
    companyName: 'Airbnb, Inc',
    price: '$32,227.00',
    change: '0.29%',
    changeDirection: 'down',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/airbnb.svg',
  },
  {
    symbol: 'ENVT',
    companyName: 'Envato, Inc',
    price: '$13,895.00',
    change: '3.79%',
    changeDirection: 'up',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/envato.svg',
  },
  {
    symbol: 'QIWI',
    companyName: 'qiwi.com, Inc',
    price: '$4,008.65',
    change: '4.52%',
    changeDirection: 'down',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/qiwi.svg',
  },
  {
    symbol: 'APPL',
    companyName: 'Apple, Inc',
    price: '$4,523.00',
    change: '3.12%',
    changeDirection: 'up',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/apple.svg',
  },
  {
    symbol: 'SPOT',
    companyName: 'Spotify.com',
    price: '$11,689.00',
    change: '9.48%',
    changeDirection: 'up',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/spotify.svg',
  },
  {
    symbol: 'ABNB',
    companyName: 'Airbnb, Inc',
    price: '$32,227.00',
    change: '0.29%',
    changeDirection: 'down',
    brandImage:
      'https://cdn-tailgrids.b-cdn.net/3.0/dashboard/widget/widget-11/airbnb.svg',
  },
];

const WatchlistItem: React.FC<WatchlistItemProps> = ({
  symbol,
  companyName,
  price,
  change,
  changeDirection,
  brandImage,
}) => {
  return (
    <div className="border-base-100 flex items-center justify-between border-b pt-4 pb-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10">
          <img src={brandImage} alt={companyName} />
        </div>
        <div>
          <h3 className="text-title-50 text-base font-semibold">{symbol}</h3>
          <span className="text-theme-xs text-text-100 block">
            {companyName}
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-theme-sm text-text-50 mb-1 text-right font-medium">
          {price}
        </h4>
        <span
          className={`text-theme-xs flex items-center justify-end gap-1 font-medium ${
            changeDirection === 'up' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {/* {changeDirection === 'up' ? <ArrowUpIcon /> : <ArrowDownIcon />} */}

          {change}
        </span>
      </div>
    </div>
  );
};

export default function Widgets11() {
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-md rounded-2xl border p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-title-50 text-lg font-semibold">My Watchlist</h3>
          <div>
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

        <div className="flex h-[372px] flex-col">
          <div className="custom-scrollbar flex h-auto flex-col overflow-y-auto pr-3">
            {watchlistData.map((item, i) => (
              <WatchlistItem key={i + 1} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
