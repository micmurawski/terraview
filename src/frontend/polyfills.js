// Polyfills for Rete.js
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = {
    env: {
      NODE_ENV: 'production'
    }
  };
} 