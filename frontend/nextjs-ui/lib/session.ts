// Session check is handled client-side via localStorage (access_token).
// The HttpOnly refresh_token cookie is sent automatically by the browser
// on API requests — it does not need to be read from JavaScript.
export {};
