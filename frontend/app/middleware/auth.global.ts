export default defineNuxtRouteMiddleware((to) => {
  const session = useCookie<string | null>('ledgera-session');

  if (!session.value && to.path !== '/auth') {
    return navigateTo('/auth');
  }

  if (session.value && to.path === '/auth') {
    return navigateTo('/');
  }
});
