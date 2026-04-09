export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapAccounts } = await import('@/lib/auth/bootstrap');
    await bootstrapAccounts();
  }
}
