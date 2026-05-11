// supabase/functions/products/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // type 
      // products (+ category)
      // categories
      // product
    const type = url.searchParams.get("type") ?? "products";

    let apiUrl: string;

    if (type === "categories") {
      apiUrl = "https://dummyjson.com/products/categories";
    } else if (type === "products") {
      const category = url.searchParams.get("category") ?? "womens-dresses";
      apiUrl = `https://dummyjson.com/products/category/${category}`;
    }else if (type === "product") {
       const id = url.searchParams.get("id") ?? "1";
       apiUrl = `https://dummyjson.com/products/${id}`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch data",
          status: response.status,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        source: "supabase-proxy",
        type,
        data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
