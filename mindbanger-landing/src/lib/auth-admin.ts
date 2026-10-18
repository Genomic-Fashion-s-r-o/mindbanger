import { bookingAdmin } from './booking/admin';

export async function checkAdminAuth() {
  return !!(await bookingAdmin(false));
}
