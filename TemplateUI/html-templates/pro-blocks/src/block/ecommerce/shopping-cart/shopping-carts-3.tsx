import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Minus, Plus, Trash1, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

// Types
interface CartItem {
  id: number;
  name: string;
  color: string;
  size?: string;
  quantity: number;
  price: number;
  image: string;
}

interface SavedItem {
  id: number;
  name: string;
  color: string;
  size?: string;
  price: number;
  image: string;
}

export default function ShoppingCarts3() {
  const [showCart, setShowCart] = useState(true);
  const [activeTab, setActiveTab] = useState<'cart' | 'saved'>('cart');
  const [promoCode, setPromoCode] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: 'Leather Sneakers',
      color: 'Black',
      size: '42',
      quantity: 1,
      price: 180,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-1.jpg',
    },
    {
      id: 2,
      name: 'Leather Wallet',
      color: 'Brown',
      quantity: 1,
      price: 85,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-2.jpg',
    },
    {
      id: 3,
      name: 'Chronograph Watch',
      color: 'Silver/Black',
      quantity: 1,
      price: 250,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-3.jpg',
    },
  ]);

  const [savedItems, setSavedItems] = useState<SavedItem[]>([
    {
      id: 4,
      name: 'Classic Leather Belt',
      color: 'Brown',
      price: 65,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-4.jpg',
    },
  ]);

  // Static values for UI
  const subtotal = 515;
  const shipping = 10;
  const taxes = 50;
  const total = 575;

  const updateQuantity = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addToCart = (savedItem: SavedItem) => {
    const newCartItem: CartItem = {
      ...savedItem,
      quantity: 1,
    };
    setCartItems((prev) => [...prev, newCartItem]);
    setSavedItems((prev) => prev.filter((item) => item.id !== savedItem.id));
    setActiveTab('cart');
  };

  const applyPromoCode = () => {
    if (promoCode.trim()) {
      setPromoCode('');
    }
  };

  return (
    <>
      <div className="flex h-screen items-center justify-center">
        <Button onClick={() => setShowCart(true)}>Open Cart</Button>
      </div>

      {/* Cart Overlay */}
      {showCart && (
        <>
          {/* Background overlay */}
          <div
            onClick={() => setShowCart(false)}
            className="fixed inset-0 z-40 h-full w-full bg-black/50 backdrop-blur-sm transition-opacity"
          ></div>

          <aside
            className={`${
              showCart ? 'translate-x-0' : 'translate-x-full'
            } bg-background-50 fixed top-0 right-0 z-50 flex h-full w-xs transform flex-col overflow-hidden px-4 py-8 transition-transform duration-300 ease-in-out sm:w-[440px] sm:p-8`}
          >
            {/* Header - Fixed at top */}
            <div className="mb-6 shrink-0">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-title-50 text-2xl font-semibold">
                  Your Cart
                </h3>
                <Button
                  iconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                >
                  <Xmark2x />
                </Button>
              </div>
              <div className="w-full sm:block">
                <nav className="border-base-100 -mb-px flex border-b">
                  {/* <!-- Tab 1 --> */}
                  <button
                    onClick={() => setActiveTab('cart')}
                    className={`cursor-pointer border-b-2 p-3 text-sm font-medium transition-colors focus:outline-none ${
                      activeTab === 'cart'
                        ? 'border-primary-500 text-primary-500'
                        : 'hover:text-primary-600 text-text-100 border-transparent'
                    }`}
                  >
                    Cart({cartItems.length})
                  </button>
                  {/* <!-- Tab 2 --> */}
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`cursor-pointer border-b-2 p-3 text-sm font-medium transition-colors focus:outline-none ${
                      activeTab === 'saved'
                        ? 'border-primary-500 text-primary-500'
                        : 'hover:text-primary-600 text-text-100 border-transparent'
                    }`}
                  >
                    Saved({savedItems.length})
                  </button>
                </nav>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="mb-6 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-12 pr-2">
                {/* <!-- Cart List --> */}
                <div>
                  {activeTab === 'cart' ? (
                    <ul className="divide-base-100 divide-y divide-dashed">
                      {cartItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between py-5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="mr-4 shrink-0">
                              <img
                                className="border-base-100 h-24 w-22 rounded-lg border sm:h-24 sm:w-24"
                                src={item.image}
                                alt={item.name}
                              />
                            </div>
                            <div className="flex grow flex-col justify-between gap-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-title-50 mb-1 line-clamp-1 text-sm font-medium">
                                    {item.name}
                                  </h3>
                                  <div>
                                    <p className="text-text-100 text-xs">
                                      {item.color}
                                      {item.size && `/Size ${item.size}`}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-text-50 text-sm font-semibold">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-5">
                                <div>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="hover:bg-background-soft-50 cursor-pointer rounded-lg p-1.5 text-sm"
                                  >
                                    <span className="text-title-50 hidden sm:block">
                                      Remove
                                    </span>

                                    <Trash1 className="text-text-100 block sm:hidden" />
                                  </button>
                                </div>
                                <div className="divide-base-100 border-base-100 flex h-10 w-30 divide-x overflow-hidden rounded-lg border sm:w-[130px]">
                                  {/* <!-- Minus Button --> */}
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    disabled={item.quantity <= 1}
                                    className={`flex h-10 w-10 items-center justify-center transition ${
                                      item.quantity <= 1
                                        ? 'text-text-100 cursor-not-allowed'
                                        : 'text-text-100 hover:bg-background-soft-50'
                                    }`}
                                  >
                                    <Minus />
                                  </button>
                                  <div className="text-text-100 flex flex-1 items-center justify-center">
                                    {item.quantity}
                                  </div>
                                  {/* <!-- Plus Button --> */}
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="text-text-100 hover:bg-background-soft-50 flex h-10 w-10 items-center justify-center transition"
                                  >
                                    <Plus />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="divide-base-100 divide-y divide-dashed">
                      {savedItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between py-5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="mr-4 shrink-0">
                              <img
                                className="border-base-100 h-24 w-22 rounded-lg border sm:h-24 sm:w-24"
                                src={item.image}
                                alt={item.name}
                              />
                            </div>
                            <div className="flex grow flex-col justify-between gap-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-title-50 mb-1 line-clamp-1 text-sm font-medium">
                                    {item.name}
                                  </h3>
                                  <div>
                                    <p className="text-text-100 text-xs">
                                      {item.color}
                                      {item.size && `/Size ${item.size}`}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-title-50 text-sm font-semibold">
                                    ${item.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-5">
                                <Button
                                  onClick={() => addToCart(item)}
                                  className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm leading-5 font-medium transition focus:ring-3"
                                >
                                  Add to Cart
                                </Button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* <!-- Cart List End --> */}

                {/* <!-- Suggestions --> */}
                <div>
                  <h3 className="border-base-100 text-title-50 border-b pb-5 text-base font-semibold">
                    You Might Also Like
                  </h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <article className="flex items-center">
                      <img
                        className="border-base-50 mr-3 block h-18 w-18 rounded-lg"
                        src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-4.jpg"
                        alt="Classic Leather Belt"
                      />
                      <div>
                        <h3 className="text-title-50 mb-2 text-sm font-medium">
                          <a href="javascript:void(0);">
                            {' '}
                            Classic Leather Belt{' '}
                          </a>
                        </h3>
                        <button
                          onClick={() =>
                            addToCart({
                              id: 5,
                              name: 'Classic Leather Belt',
                              color: 'Brown',
                              price: 65,
                              image:
                                'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-4.jpg',
                            })
                          }
                          className="border-base-100 text-title-50 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </article>
                    <article className="flex items-center">
                      <img
                        className="border-base-50 mr-3 block h-18 w-18 rounded-lg"
                        src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-5.jpg"
                        alt="Stylish Sunglass"
                      />
                      <div>
                        <h3 className="text-title-50 mb-2 text-sm font-medium">
                          <a href="javascript:void(0);"> Stylish Sunglass</a>
                        </h3>
                        <button
                          onClick={() =>
                            addToCart({
                              id: 6,
                              name: 'Stylish Sunglass',
                              color: 'Black',
                              price: 95,
                              image:
                                'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-03/product-5.jpg',
                            })
                          }
                          className="border-base-100 text-text-50 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </article>
                  </div>
                </div>
                {/* <!-- Suggestions End --> */}
              </div>
            </div>

            {/* Summary - Fixed at bottom */}
            <div className="shrink-0">
              <div>
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  Have a promo code?
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      className="flex-1"
                      type="text"
                      placeholder="Enter code here"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                  </div>
                  <Button onClick={applyPromoCode}>Apply</Button>
                </div>
              </div>
              <div className="mt-6">
                <ul className="text-text-50 space-y-4 pb-5 text-base">
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-normal">
                      Subtotal
                    </p>
                    <p className="text-text-50 font-medium">
                      ${subtotal.toFixed(2)}
                    </p>
                  </li>
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-normal">
                      Shipping
                    </p>
                    <p className="text-text-50 font-medium">
                      ${shipping.toFixed(2)}
                    </p>
                  </li>
                  <li className="flex justify-between">
                    <p className="text-text-50">Taxes</p>
                    <p className="text-text-50 font-medium">
                      ${taxes.toFixed(2)}
                    </p>
                  </li>
                </ul>
                <div className="border-base-100 text-title-50 flex justify-between border-t pt-5 font-medium">
                  <p>Total</p>
                  <p>${total.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => console.log('Proceeding to checkout...')}
                  className="h-12 w-full"
                >
                  Proceed to Checkout
                </Button>
                <p className="text-text-100 mt-4 text-center">
                  Or
                  <a
                    href="javascript:void(0);"
                    className="text-primary-600 ml-2 inline-block text-base font-medium"
                  >
                    Continue Shopping
                  </a>
                </p>
              </div>
            </div>
            {/* <!-- Summary End --> */}
          </aside>
        </>
      )}
    </>
  );
}
