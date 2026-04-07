import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Minus, Plus, Trash1 } from '@tailgrids/icons';
import React, { useMemo, useState } from 'react';

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

interface PromoCode {
  code: string;
  discount: number;
  isValid: boolean;
}

// Cart Item Component
interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: number, newQuantity: number) => void;
  onRemoveItem: (id: number) => void;
}

const CartItemComponent: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = item.quantity + delta;

    // Prevent quantity from going below 1
    if (newQuantity < 1) {
      return;
    }

    onUpdateQuantity(item.id, newQuantity);
  };

  const handleRemoveFromCart = () => {
    onRemoveItem(item.id);
  };

  return (
    <li className="flex justify-between py-6 first:pt-0 last:pb-0">
      <div className="flex">
        <div className="mr-4">
          <img
            className="h-25 w-25 rounded-lg"
            src={item.image}
            alt={item.name}
          />
        </div>
        <div className="grow space-y-4">
          <div>
            <h3 className="text-title-50 line-clamp-1 text-sm font-semibold">
              {item.name}
            </h3>
            <div className="flex items-center space-x-2">
              <p className="text-text-100 text-sm">
                {item.color} - {item.quantity}x
              </p>
              <span className="text-text-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="4"
                  height="4"
                  viewBox="0 0 4 4"
                  fill="none"
                >
                  <circle cx="2.33301" cy="2" r="1.5" fill="#D1D5DB" />
                </svg>
              </span>
              <p className="text-text-100 text-sm">Size {item.size}</p>
            </div>
          </div>
          <div className="border-base-200 divide-base-100 mt-4 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
              title={
                item.quantity <= 1
                  ? 'Minimum quantity is 1. Use remove button to delete item.'
                  : 'Decrease quantity'
              }
              className={`flex h-10 w-10 items-center justify-center transition ${
                item.quantity <= 1
                  ? 'bg-background-soft-50 text-text-300 cursor-not-allowed'
                  : 'text-text-100 hover:bg-background-soft-100 cursor-pointer'
              }`}
            >
              <Minus />
            </button>
            <div className="text-text-100 flex flex-1 items-center justify-center">
              {item.quantity}
            </div>
            <button
              onClick={() => handleQuantityChange(1)}
              title="Increase quantity"
              className="text-text-100 hover:bg-background-soft-100 flex h-10 w-10 cursor-pointer items-center justify-center transition"
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
          onClick={handleRemoveFromCart}
          className="text-text-100 hover:bg-background-soft-50 inline-flex cursor-pointer items-center gap-1 rounded-lg p-1.5 text-sm font-medium"
        >
          <Trash1 />
          Remove
        </button>
      </div>
    </li>
  );
};

export default function ShoppingCarts2() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: 'Wool Cable Knit Sweater',
      color: 'Charcoal',
      size: 'M',
      quantity: 1,
      price: 88.0,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-02/product-1.jpg',
    },
    {
      id: 2,
      name: 'Selvedge Denim Jeans',
      color: 'Jeans',
      size: 'M',
      quantity: 1,
      price: 129.0,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-02/product-2.jpg',
    },
    {
      id: 3,
      name: 'Italian Leather Belt',
      color: 'Belt',
      size: 'M',
      quantity: 1,
      price: 59.5,
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/shopping-carts/shopping-cart-02/product-3.jpg',
    },
  ]);

  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  // Mock promo codes
  const validPromoCodes: Record<string, PromoCode> = {
    SAVE10: { code: 'SAVE10', discount: 0.1, isValid: true },
    SAVE20: { code: 'SAVE20', discount: 0.2, isValid: true },
    WELCOME: { code: 'WELCOME', discount: 0.15, isValid: true },
  };

  // Dynamic calculations
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const shipping = useMemo(() => (subtotal > 100 ? 0 : 4.99), [subtotal]);
  const taxRate = 0.1328; // 13.28%
  const taxes = useMemo(() => subtotal * taxRate, [subtotal]);
  const discount = useMemo(
    () => (appliedPromo ? subtotal * appliedPromo.discount : 0),
    [subtotal, appliedPromo],
  );
  const total = useMemo(
    () => subtotal + shipping + taxes - discount,
    [subtotal, shipping, taxes, discount],
  );

  // Event handlers
  const handleUpdateQuantity = (id: number, newQuantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const handleRemoveItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyPromoCode = () => {
    const upperCode = promoCode.toUpperCase();
    if (validPromoCodes[upperCode]) {
      setAppliedPromo(validPromoCodes[upperCode]);
      setPromoCode('');
    } else {
      alert('Invalid promo code');
    }
  };

  const handleContinueShopping = () => {
    console.log('Continue shopping');
  };

  return (
    <section className="bg-background-soft-100 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="bg-background-100 rounded-2xl px-5 py-7 shadow-sm sm:p-7 lg:col-span-2">
            <div>
              <h3 className="border-base-100 text-title-50 border-b pb-4 text-base leading-6 font-semibold">
                Shopping Cart ({cartItems.length}{' '}
                {cartItems.length === 1 ? 'item' : 'items'})
              </h3>

              {cartItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-text-100">Your cart is empty</p>
                  <button
                    onClick={handleContinueShopping}
                    className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 text-white-100 mt-4 inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-sm leading-5 font-medium transition focus:ring-3"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <ul className="divide-base-100 divide-y divide-dashed pt-6">
                  {cartItems.map((item) => (
                    <CartItemComponent
                      key={item.id}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemoveItem={handleRemoveItem}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-background-50 rounded-2xl p-7 shadow-sm">
              <div>
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  Have a promo code?
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={promoCode}
                      placeholder="Enter code here"
                    />
                  </div>
                  <Button onClick={handleApplyPromoCode}>Apply</Button>
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
                    <p className="text-text-50 text-base">Shipping</p>
                    <p className="text-text-50 font-medium">
                      ${shipping.toFixed(2)}
                    </p>
                  </li>
                  <li className="flex justify-between">
                    <p className="text-text-50 text-base font-normal">Taxes</p>
                    <p className="text-text-50 font-medium">
                      ${taxes.toFixed(2)}
                    </p>
                  </li>
                </ul>
                <div className="border-base-100 text-title-50 flex justify-between border-t pt-5 font-medium">
                  <p className="text-text-50 text-base">Total</p>
                  <p className="text-text-50 text-base font-medium">
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  className="h-12 w-full"
                  disabled={cartItems.length === 0}
                >
                  Proceed to checkout
                </Button>
                <Button appearance="outline" className="h-12 w-full">
                  Continue shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
