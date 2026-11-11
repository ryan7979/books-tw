import { DICTIONARY } from '../src/utils/dictionary.js';

const GATE_COOKIE = "news_session";

function getGateCookie(request) {
  return (request.headers.get("cookie") || "")
    .split(";")
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${GATE_COOKIE}=`))
    ?.slice(GATE_COOKIE.length + 1);
}

async function signGateToken(nonce, ip, userAgent, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${nonce}\n${ip}\n${userAgent}`)
  );
  return Array.from(new Uint8Array(signature), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hasGateCookie(request, secret) {
  if (!secret) return false;

  const token = getGateCookie(request);
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return false;

  const nonce = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!/^[0-9a-f]{32}$/i.test(nonce)) return false;
  if (!/^[0-9a-f]{64}$/i.test(suppliedSignature)) return false;

  const ip = request.headers.get("cf-connecting-ip")?.split(",")[0]?.trim() || "unknown-ip";
  const userAgent = request.headers.get("user-agent") || "unknown-ua";
  const expectedSignature = await signGateToken(nonce, ip, userAgent, secret);
  return timingSafeEqual(suppliedSignature.toLowerCase(), expectedSignature);
}

function isPublicAsset(pathname) {
  return pathname === "/favicon.ico" ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/@") ||
    /\.(?:css|js|mjs|map|wasm|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot|md)$/i.test(pathname);
}

function isPrivateBookAsset(pathname) {
  return pathname === "/books" ||
    pathname.startsWith("/books/") ||
    pathname === "/_private" ||
    pathname.startsWith("/_private/") ||
    pathname === "/public/books" ||
    pathname.startsWith("/public/books/");
}

export async function onRequest(context) {
  const { request, env } = context;
  const REQUIRED_KEY = env?.REQUIRED_KEY;
  const REQUIRED_VALUE = env?.REQUIRED_VALUE;
  const gateSecret = env?.GATE_COOKIE_SECRET || REQUIRED_VALUE;
  const url = new URL(request.url);

  if (isPrivateBookAsset(url.pathname)) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (isPublicAsset(url.pathname)) {
    return context.next();
  }

  const hasCookie = await hasGateCookie(request, gateSecret);
  const hasValidEntry = Boolean(REQUIRED_KEY) && Boolean(REQUIRED_VALUE) &&
    url.searchParams.get(REQUIRED_KEY) === REQUIRED_VALUE;

  if (request.method === "GET" && hasValidEntry) {
    url.searchParams.delete(REQUIRED_KEY);

    const ip = request.headers.get("cf-connecting-ip")?.split(",")[0]?.trim() || "unknown-ip";
    const userAgent = request.headers.get("user-agent") || "unknown-ua";
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const signature = await signGateToken(nonce, ip, userAgent, gateSecret);

    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${url.pathname}${url.search}`,
        "Set-Cookie": `${GATE_COOKIE}=${nonce}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!hasCookie && !hasValidEntry) {
    return new Response(
      `<!DOCTYPE html>
       <html lang="zh-Hant">
       <head><title>403 Access Denied</title></head>
       <body style="font-family:sans-serif;text-align:center;padding:100px;background:#f1f5f9;color:#334155">
         <h1 style="color:#ef4444">🔒 ${DICTIONARY.accessDenied}</h1>
       </body>
       </html>`,
      {
        status: 403,
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return context.next();
}
