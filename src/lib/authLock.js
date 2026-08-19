let suppressAnonymousSignIn = false;

export function shouldSuppressAnonymousSignIn() {
  return suppressAnonymousSignIn;
}

export async function withSuppressedAnonymousSignIn(fn) {
  suppressAnonymousSignIn = true;
  try {
    return await fn();
  } finally {
    suppressAnonymousSignIn = false;
  }
}
