import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Minus, Plus, Trash1, Xmark2x } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types
interface CartItem {
  id: number;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

// Placeholder components for SVG icons (to be replaced with actual imports)

const ShoppingCarts1: React.FC = () => {
  const [showCart, setShowCart] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: 'Wool Cable Knit Sweater',
      color: 'Charcoal',
      size: 'M',
      quantity: 1,
      price: 88.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-01/product-1.jpg',
    },
    {
      id: 2,
      name: 'Selvedge Denim Jeans',
      color: 'Jeans',
      size: 'M',
      quantity: 1,
      price: 129.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-01/product-2.jpg',
    },
    {
      id: 3,
      name: 'Italian Leather Belt',
      color: 'Belt',
      size: 'M',
      quantity: 1,
      price: 59.5,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-01/product-3.jpg',
    },
  ]);

  // Static values for UI
  const subtotal = 270;
  const shipping = 10;
  const taxes = 25;
  const total = 305;

  const updateQuantity = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
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
            className={` ${
              showCart ? 'translate-x-0' : 'translate-x-full'
            } bg-background-50 fixed top-0 right-0 z-50 flex h-full w-xs transform flex-col overflow-hidden px-4 py-8 transition-transform duration-300 ease-in-out sm:w-md sm:p-8`}
          >
            {/* Header */}
            <div className="mb-6 flex shrink-0 items-center justify-between">
              <h3 className="text-title-50 text-2xl font-semibold">
                Your Cart({cartItems.length})
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="text-text-100 hover:bg-background-soft-50 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-transparent"
              >
                <Xmark2x className="size-5" />
              </button>
            </div>
            {/* Header End */}

            {/* Cart List - Scrollable Area */}
            <div className="mb-6 min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-base-100 divide-y divide-dashed pr-2">
                {cartItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex">
                      <div className="mr-4 shrink-0">
                        <img
                          className="h-24 w-21 rounded-lg"
                          src={item.image}
                          alt={item.name}
                        />
                      </div>
                      <div className="grow space-y-4">
                        <div>
                          <h3 className="text-title-50 line-clamp-1 text-sm font-semibold">
                            {item.name}
                          </h3>
                          <div className="flex flex-wrap items-center space-x-2">
                            <p className="text-text-100 text-sm">
                              {item.color} - {item.quantity}x
                            </p>
                            <span className="text-text-100">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="4"
                                height="4"
                                viewBox="0 0 4 4"
                                fill="none"
                              >
                                <circle
                                  cx="2.33301"
                                  cy="2"
                                  r="1.5"
                                  fill="#D1D5DB"
                                />
                              </svg>
                            </span>
                            <p className="text-text-100 text-sm">
                              Size {item.size}
                            </p>
                          </div>
                        </div>
                        <div className="divide-base-100 border-base-100 mt-4 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="text-text-50 hover:bg-background-soft-100 flex h-10 w-10 items-center justify-center transition"
                          >
                            <Minus />
                          </button>
                          <div className="text-text-50 flex flex-1 items-center justify-center">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="text-text-50 hover:bg-background-soft-100 flex h-10 w-10 items-center justify-center transition"
                          >
                            <Plus />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <p className="text-text-50 text-sm font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-text-100 hover:bg-text-50 cursor-pointer rounded-lg p-1.5"
                      >
                        <Trash1 />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Cart List End */}

            {/* Summary - Fixed at bottom */}
            <div className="shrink-0">
              <div>
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  Have a promo code?
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input type="text" placeholder="Enter code here" />
                  </div>

                  <Button>Apply</Button>
                </div>
              </div>
              <div className="mt-6">
                <ul className="text-text-50 space-y-4 pb-5 text-base">
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-medium">
                      Subtotal
                    </p>
                    <p className="text-text-50 text-base font-medium">
                      ${subtotal.toFixed(2)}
                    </p>
                  </li>
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-medium">
                      Shipping
                    </p>
                    <p className="text-text-50 text-base font-medium">
                      ${shipping.toFixed(2)}
                    </p>
                  </li>
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-medium">Taxes</p>
                    <p className="text-text-50 text-base font-medium">
                      ${taxes.toFixed(2)}
                    </p>
                  </li>
                </ul>
                <div className="border-base-100 text-title-50 flex justify-between border-t pt-5 font-medium">
                  <p className="text-text-50 text-base font-medium">Total</p>
                  <p className="text-text-50 text-base font-medium">
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Button className="h-12 w-full">View Cart</Button>
                <Button appearance="outline" className="h-12 w-full">
                  Proceed to Checkout
                </Button>
              </div>
            </div>
            {/* Summary End */}
          </aside>
        </>
      )}
    </>
  );
};

export default ShoppingCarts1;
