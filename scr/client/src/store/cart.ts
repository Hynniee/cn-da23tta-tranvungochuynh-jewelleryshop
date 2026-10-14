export type CartItem = {
  _id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  material?: string;
  carat?: string;
  engraving?: string;
};

const KEY = 'mira_cart';

export function getCart(): CartItem[] {
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cartchange'));
}

export function addCart(item: CartItem) {
  const cart = getCart();
  const index = cart.findIndex(
    (x) => x._id === item._id && x.size === item.size && x.material === item.material && x.carat === item.carat
  );
  if (index >= 0) cart[index].quantity += item.quantity;
  else cart.push(item);
  saveCart(cart);
}
