export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrato con successo:', registration.scope);
        })
        .catch((error) => {
          console.warn('Service Worker non registrato:', error);
        });
    });
  }
}
