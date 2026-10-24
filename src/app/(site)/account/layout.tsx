import { requireCustomer } from '@/server/rbac';
import { AccountNav } from '@/components/AccountNav';

export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await requireCustomer();
  return (
    <div className="container-x py-8 md:py-12">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-1 !text-[2rem] md:!text-[2.6rem]">Hello, {u.name.split(' ')[0]}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
