import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TryOnRequest = {
  productImageUrl: string;
  sampleCount?: number;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64UrlEncode(input: string | ArrayBuffer) {
  let binary = "";

  if (typeof input === "string") {
    binary = input;
  } else {
    const bytes = new Uint8Array(input);

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function stripDataUrlPrefix(base64: string) {
  return base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

async function imageUrlToBase64(imageUrl: string) {
  const parsedUrl = new URL(imageUrl);

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("Product image URL must be http or https");
  }

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download product image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    throw new Error(`Product URL did not return an image. content-type=${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function createGoogleAccessToken() {
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey.replace(/\\n/g, "\n")),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to get Google access token: ${JSON.stringify(tokenData)}`,
    );
  }

  return tokenData.access_token as string;
}

Deno.serve(async (req) => {
  const requestStartTime = performance.now();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        { error: "Missing Authorization header" },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        { error: "Missing Supabase server environment variables" },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Invalid or expired user token",
          details: userError?.message,
        },
        401,
      );
    }

    const body = (await req.json()) as TryOnRequest;

    const { productImageUrl } = body;
    const sampleCount = body.sampleCount ?? 1;

    if (!productImageUrl) {
      return jsonResponse(
        { error: "Missing productImageUrl" },
        400,
      );
    }

    if (sampleCount < 1 || sampleCount > 4) {
      return jsonResponse(
        { error: "sampleCount must be between 1 and 4" },
        400,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_picture_base64")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse(
        {
          error: "Could not find user profile",
          details: profileError?.message,
        },
        404,
      );
    }

    if (!profile.profile_picture_base64) {
      return jsonResponse(
        {
          error: "User has no registered profile picture",
          field: "profiles.profile_picture_base64",
        },
        400,
      );
    }

    const personImageBase64 = stripDataUrlPrefix(
      profile.profile_picture_base64,
    );

    const productImageBase64 = await imageUrlToBase64(productImageUrl);

    const projectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
    const location = Deno.env.get("GOOGLE_CLOUD_LOCATION") ?? "europe-west4";

    if (!projectId) {
      return jsonResponse(
        { error: "Missing GOOGLE_CLOUD_PROJECT_ID secret" },
        500,
      );
    }

    const accessToken = await createGoogleAccessToken();

    const endpoint =
      `https://${location}-aiplatform.googleapis.com/v1` +
      `/projects/${projectId}` +
      `/locations/${location}` +
      `/publishers/google/models/virtual-try-on-001:predict`;
    const googleResponseStartTime = performance.now();
    const googleResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        instances: [
          {
            personImage: {
              image: {
                bytesBase64Encoded: personImageBase64,
              },
            },
            productImages: [
              {
                image: {
                  bytesBase64Encoded: productImageBase64,
                },
              },
            ],
          },
        ],
        parameters: {
          sampleCount,
        },
      }),
    });

    const googleData = await googleResponse.json();
    const googleResponseDurationMs = Math.round(
      performance.now() - googleResponseStartTime
    );

    const requestDurationMs =Math.round(
      performance.now() - requestStartTime 
    );

    await supabase.from("try_on_requests").insert({
      user_id: user.id,
      google_status: googleResponse.status,
      google_duration_ms: googleResponseDurationMs,
      total_duration_ms: requestDurationMs,
      success: googleResponse.ok,
      error_message: googleResponse.ok
        ? null
        : "Google Virtual Try-On request failed",
    });
    if (!googleResponse.ok) {
      return jsonResponse(
        {
          error: "Google Virtual Try-On request failed",
          status: googleResponse.status,
          details: googleData,
        },
        googleResponse.status,
      );
    }

    return jsonResponse({
      source: "google-vertex-ai-virtual-try-on",
      userId: user.id,
      productImageUrl,
      data: googleData,
    });
   
  } catch (error) {
    return jsonResponse(
      {
        error: "Internal server error",
        details: String(error),
      },
      500,
    );
  }
  

});
