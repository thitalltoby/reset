'use client';

import { useActionState, useOptimistic } from 'react';
import { toggleFavouriteAction } from '@/app/(site)/shop-actions';
import { Icon } from './Icon';

export function FavouriteButton({ productId, name, saved, next }: { productId: string; name: string; saved: boolean; next: string }) {
  const [, action] = useActionState(toggleFavouriteAction, null);
  const [on, setOn] = useOptimistic(saved, (_cur, v: boolean) => v);
  return (
    <form action={(fd) => { setOn(!on); return action(fd); }} className="contents">
      <input type="hidden" name="productId" value={productId} /><input type="hidden" name="next" value={next} />
      <button type="submit" className="fav-btn" aria-pressed={on} aria-label={on ? `Remove ${name} from favourites` : `Save ${name} to favourites`}><Icon name="heart" size={19} filled={on} /></button>
    </form>
  );
}
