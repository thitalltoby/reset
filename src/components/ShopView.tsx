import Link from 'next/link';
import { Suspense } from 'react';
import { categoryTree, listProducts, SORTS, type ListQuery } from '@/server/catalog';
import { getSessionUser } from '@/server/session';
import { favouriteIds } from '@/server/account';
import { ProductGrid } from './ProductCard';
import { SortSelect } from './SortSelect';
import { Empty, Pagination, qs } from './ui';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';

export type ShopParams = { q?: string; min?: string; max?: string; stock?: string; sale?: string; sort?: string; page?: string };

export async function ShopView({ params, categorySlug }: { params: ShopParams; categorySlug?: string }) {
  const sortOk = SORTS.some((s) => s.value === params.sort);
  const n = (v?: string) => { const x = Number(v); return v && Number.isFinite(x) && x >= 0 ? Math.round(x * 100) : undefined; };
  const query: ListQuery = {
    category: categorySlug, q: params.q?.trim().slice(0, 60) || undefined, min: n(params.min), max: n(params.max),
    inStock: params.stock === '1', onSale: params.sale === '1', sort: sortOk ? (params.sort as ListQuery['sort']) : 'relevance', page: Number(params.page) || 1, pageSize: 24,
  };
  const [tree, result, user] = await Promise.all([categoryTree(), listProducts(query), getSessionUser()]);
  const canFav = user?.role === 'CUSTOMER';
  const favs = canFav ? await favouriteIds(user!.id) : undefined;
  const current = categorySlug ? tree.flatMap((c) => [c, ...c.children]).find((c) => c.slug === categorySlug) : undefined;
  const parent = current ? tree.find((c) => c.slug === current.slug) ?? tree.find((c) => c.children.some((x) => x.slug === current.slug)) : undefined;
  const subs = parent?.children ?? [];
  const base = categorySlug ? `/shop/${categorySlug}` : '/shop';
  const keep = { q: query.q, min: params.min, max: params.max, stock: params.stock, sale: params.sale, sort: sortOk ? params.sort : undefined };
  const filtersActive = !!(params.min || params.max || params.stock === '1' || params.sale === '1');
  const title = query.q ? `Results for “${query.q}”` : current ? current.name : params.sale === '1' ? 'Offers' : 'Shop';

  const filterForm = (
            <form action={base} method="get" className="space-y-4">
              {query.q && <input type="hidden" name="q" value={query.q} />}
              {sortOk && <input type="hidden" name="sort" value={params.sort} />}
              <fieldset><legend className="label">Price (₦)</legend>
                <div className="flex items-center gap-2">
                  <input className="input" name="min" inputMode="numeric" placeholder="Min" aria-label="Lowest price in naira" defaultValue={params.min ?? ''} />
                  <span aria-hidden="true">–</span>
                  <input className="input" name="max" inputMode="numeric" placeholder="Max" aria-label="Highest price in naira" defaultValue={params.max ?? ''} />
                </div>
              </fieldset>
              <label className="check"><input type="checkbox" name="stock" value="1" defaultChecked={params.stock === '1'} /><span>In stock to buy now</span></label>
              <label className="check"><input type="checkbox" name="sale" value="1" defaultChecked={params.sale === '1'} /><span>On offer</span></label>
              <div className="flex gap-2"><button className="btn btn-primary btn-sm flex-1" type="submit">Apply</button>{filtersActive && <Link className="btn btn-outline btn-sm" href={`${base}${qs({ q: query.q })}`}>Clear</Link>}</div>
            </form>
  );
  return (
    <div className="container-x py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/">Home</Link></li><li aria-hidden="true">/</li>
          <li>{current || query.q ? <Link href="/shop">Shop</Link> : <span aria-current="page">Shop</span>}</li>
          {current && <><li aria-hidden="true">/</li><li><span aria-current="page">{current.name}</span></li></>}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="!text-[2rem] md:!text-[2.6rem]">{title}</h1>{current?.blurb && <p className="lead mt-2">{current.blurb}</p>}</div>
        <Suspense><SortSelect options={SORTS} value={sortOk ? params.sort! : 'relevance'} /></Suspense>
      </div>

      <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Categories">
        <Link role="listitem" href={`/shop${qs({ q: query.q })}`} className={`chip ${!categorySlug ? '!bg-forest !text-white' : 'chip-line'} no-underline whitespace-nowrap !py-2 !px-4`} aria-current={!categorySlug ? 'page' : undefined}>All</Link>
        {tree.map((c) => {
          const on = c.slug === categorySlug || c.children.some((x) => x.slug === categorySlug);
          return <Link role="listitem" key={c.id} href={`/shop/${c.slug}${qs({ q: query.q })}`} className={`chip ${on ? '!bg-forest !text-white' : 'chip-line'} no-underline whitespace-nowrap !py-2 !px-4`} aria-current={on ? 'page' : undefined}>{c.name} <span className={on ? 'text-white/75' : 'text-muted'}>{c.count}</span></Link>;
        })}
      </div>
      {subs.length > 0 && (
        <div className="mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Sub-categories">
          {subs.map((c) => <Link role="listitem" key={c.id} href={`/shop/${c.slug}`} className={`chip ${c.slug === categorySlug ? '!bg-mint-2' : ''} no-underline whitespace-nowrap`} aria-current={c.slug === categorySlug ? 'page' : undefined}>{c.name} ({c.count})</Link>)}
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filters">
          <div className="card card-pad hidden lg:block">
            <p className="inline-flex items-center gap-2 font-display font-semibold"><Icon name="filter" size={18} />Filters{filtersActive && <span className="chip !py-0">On</span>}</p>
            <div className="mt-4">{filterForm}</div>
          </div>
          <details className="card card-pad group lg:hidden" open={filtersActive}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold ">
              <span className="inline-flex items-center gap-2"><Icon name="filter" size={18} />Filters{filtersActive && <span className="chip !py-0">On</span>}</span>
              <Icon name="chevronDown" size={18} />
            </summary>
            {filterForm}
          </details>
        </aside>

        <section aria-label="Products">
          <p className="text-muted text-[.95rem] mb-4" aria-live="polite">{result.total === 0 ? 'No products found' : `${result.total} product${result.total === 1 ? '' : 's'}`}</p>
          {result.items.length ? (
            <>
              <ProductGrid cards={result.items} favourites={favs} canFavourite={canFav} next={`${base}${qs({ ...keep, page: query.page && query.page > 1 ? query.page : undefined })}`} />
              <Pagination page={result.page} pages={result.pages} hrefFor={(p) => `${base}${qs({ ...keep, page: p > 1 ? p : undefined })}`} />
            </>
          ) : (
            <div className="card card-pad text-center py-12">
              <ProductArt kind="drop" size={88} className="mx-auto" />
              <h2 className="!text-xl mt-3">{query.q ? `We could not find “${query.q}”` : 'Nothing here yet'}</h2>
              <p className="text-muted mt-1 max-w-md mx-auto">{query.q ? 'Check the spelling, try a shorter word, or tell us what you are looking for and a pharmacist will help.' : 'Try a different category, or clear the filters.'}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {filtersActive && <Link className="btn btn-outline" href={`${base}${qs({ q: query.q })}`}>Clear filters</Link>}
                <Link className="btn btn-primary" href={`/contact${qs({ topic: 'product', about: query.q })}`}>Ask the pharmacy</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export { Empty };
