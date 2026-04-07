import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Minus, Plus, Trash1 } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types
interface CartItem {
  id: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

// Cart Item Component
interface CartItemProps {
  item: CartItem;
}

const CartItemComponent: React.FC<CartItemProps> = ({ item }) => {
  return (
    <li className="flex justify-between py-5 first:pt-0 last:pb-0">
      <div className="flex">
        <div>
          <img
            className="mr-4 h-25 w-25 rounded-lg"
            src={item.image}
            alt={item.name}
          />
        </div>
        <div className="grow space-y-4">
          <div>
            <h3 className="text-title-50 text-sm font-semibold">{item.name}</h3>
            <p className="text-text-100 text-sm">Size: {item.size}</p>
          </div>
          <div className="divide-base-100 border-base-100 mt-4 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
            <button className="bg-background-soft-50 text-text-100 flex h-10 w-10 cursor-not-allowed items-center justify-center transition">
              <Minus />
            </button>
            <div className="text-text-50 flex flex-1 items-center justify-center">
              {item.quantity}
            </div>
            <button className="text-text-100 hover:bg-background-soft-100 flex h-10 w-10 items-center justify-center transition">
              <Plus />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <p className="text-text-50 text-sm font-semibold">
          ${(item.price * item.quantity).toFixed(2)}
        </p>
        <Button
          iconOnly
          size="sm"
          variant="ghost"
          title="Remove item from cart"
        >
          <Trash1 className="size-5" />
        </Button>
      </div>
    </li>
  );
};

export default function ShoppingCarts5() {
  const [promoCode, setPromoCode] = useState<string>('');

  const cartItems: CartItem[] = [
    {
      id: 1,
      name: 'Classic Cotton T-shirt',
      size: 'M',
      quantity: 1,
      price: 88.0,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-05/product-3.jpg',
    },
    {
      id: 2,
      name: 'Premium Denim Jeans',
      size: 'L',
      quantity: 2,
      price: 129.0,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-05/product-2.jpg',
    },
    {
      id: 3,
      name: 'Leather Casual Belt',
      size: 'M',
      quantity: 1,
      price: 59.5,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-05/product-3.jpg',
    },
  ];

  const subtotal = 405.5;

  const taxes = 32.44;
  const total = 437.94;

  return (
    <section className="bg-background-50 py-10 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-[606px]">
          <h2 className="text-title-50 mb-5 text-3xl font-semibold lg:mb-10">
            Your Cart Items ({cartItems.length})
          </h2>

          {cartItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-100 text-lg">Your cart is empty</p>
              <Button>Start Shopping</Button>
            </div>
          ) : (
            <>
              <ul className="divide-base-100 divide-y">
                {cartItems.map((item) => (
                  <CartItemComponent key={item.id} item={item} />
                ))}
              </ul>

              <div className="mt-6">
                <div>
                  <label className="text-text-50 mb-2 block text-sm font-medium">
                    Have a promo code?
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={promoCode}
                        className="h-12"
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter code here"
                      />
                    </div>
                    <Button className="h-12">Apply</Button>
                  </div>
                </div>

                <ul className="text-text-50 space-y-4 py-4 text-base">
                  <li className="flex justify-between">
                    <p>Subtotal</p>
                    <p className="font-medium">${subtotal.toFixed(2)}</p>
                  </li>
                  <li className="flex justify-between">
                    <p>Shipping</p>
                    <p className="font-medium">Free</p>
                  </li>
                  <li className="flex justify-between">
                    <p>Taxes</p>
                    <p className="font-medium">${taxes.toFixed(2)}</p>
                  </li>
                </ul>

                <div className="border-base-100 text-title-50 mb-8 flex justify-between border-t pt-4">
                  <p className="font-semibold">Total</p>
                  <p className="font-semibold">${total.toFixed(2)}</p>
                </div>

                <Button className="h-12 w-full">Proceed to Checkout</Button>

                <p className="text-text-100 mt-4 text-center">
                  Or
                  <button className="text-primary-600 hover:text-primary-700 ml-2 inline-block text-base font-medium transition-colors">
                    Continue Shopping
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
