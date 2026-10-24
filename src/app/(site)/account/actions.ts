'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { bool, runAction, str, type FormState } from '@/server/action-utils';
import { actionCustomer } from '@/server/rbac';
import { deleteAddress, deleteMyAccount, reorder, saveAddress, updateProfile } from '@/server/account';
import { changePassword } from '@/server/auth';
import { destroySession } from '@/server/session';
import { invalid } from '@/server/errors';

export async function reorderAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionCustomer();
    const msg = await reorder(u, str(fd, 'orderId'));
    revalidatePath('/', 'layout');
    return msg;
  });
}

export async function saveAddressAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionCustomer();
    await saveAddress(u, str(fd, 'id') || null, {
      label: str(fd, 'label') || 'Home', recipient: str(fd, 'recipient'), phone: str(fd, 'phone'), line1: str(fd, 'line1'), line2: str(fd, 'line2'),
      city: str(fd, 'city'), state: str(fd, 'state'), notes: str(fd, 'notes'), isDefault: bool(fd, 'isDefault'),
    });
    revalidatePath('/account/addresses');
    return 'Address saved.';
  });
}

export async function deleteAddressAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { await deleteAddress(await actionCustomer(), str(fd, 'id')); revalidatePath('/account/addresses'); });
}

export async function updateProfileAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    await updateProfile(await actionCustomer(), { name: str(fd, 'name'), phone: str(fd, 'phone'), marketing: bool(fd, 'marketing') });
    revalidatePath('/account', 'layout');
    return 'Saved.';
  });
}

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionCustomer();
    if (str(fd, 'next') !== str(fd, 'confirm')) throw invalid('The new passwords do not match.', { confirm: 'Does not match.' });
    await changePassword(u.id, str(fd, 'current'), str(fd, 'next'));
    return 'Password changed.';
  });
}

export async function deleteAccountAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionCustomer();
    if (str(fd, 'confirm').trim().toLowerCase() !== 'delete') throw invalid('Type DELETE to confirm.', { confirm: 'Type DELETE.' });
    await deleteMyAccount({ id: u.id, name: u.name, email: u.email }, str(fd, 'password'), (hash, pw) => bcrypt.compare(pw, hash));
    await destroySession();
    redirect('/?account=deleted');
  });
}
