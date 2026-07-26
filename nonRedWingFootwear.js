// Non-Red-Wing footwear that can occasionally win the "Third Choice" slot
// on genuinely hot days, or get suggested by the custom outfit matcher on
// really hot days with a casual outfit. Shaped like a boot entry so it can
// flow through the same scoring/rendering pipeline; isRedWing:false is the
// flag everything else checks against.

export const NON_RED_WING_FOOTWEAR = [
  {
    id: "birkenstock-kyoto",
    isRedWing: false,
    brand: "Birkenstock",
    model: "Kyoto",
    name: "Birkenstock Kyoto (Desert Buck Nubuck)",
    leather: "Desert Buck Nubuck",
    allowedMonths: [5, 6, 7, 8, 9],
    idealTempF: [80, 105],
    tags: ["hot-ok", "shorts", "casual"],
    signature: "Preppy warm-weather alternative",
    limiter: "Not a boot — only makes sense on genuinely hot days",
    outfit:
      "Are you sure you want Red Wings today? On a day this hot, the Birkenstock Kyoto with the Quince Linen Natural shorts or 01.algo Performance Shorts and a Kuhl Short Sleeve reads preppy and cool without fighting the heat.",
    matchKeywords: ["sandals", "birkenstock", "preppy", "linen", "polo", "camp collar", "chinos", "shorts"],
  },
  {
    id: "adidas-vl-court",
    isRedWing: false,
    brand: "adidas",
    model: "VL Court 3.0",
    name: "adidas VL Court 3.0 (White / Black)",
    leather: "Leather sneaker",
    allowedMonths: [5, 6, 7, 8, 9],
    idealTempF: [80, 105],
    tags: ["hot-ok", "shorts", "casual"],
    signature: "Casual sneaker alternative",
    limiter: "Not a boot — only makes sense on genuinely hot, casual days",
    outfit:
      "Are you sure you want Red Wings today? White adidas VL Court sneakers with Waggle Shorts and a Marine Layer Banks Tee is the smarter, cooler move on a day like this.",
    matchKeywords: ["sneakers", "white sneakers", "adidas", "tee", "t-shirt", "joggers", "shorts", "athleisure"],
  },
  {
    id: "adidas-daily-3-blue",
    isRedWing: false,
    brand: "adidas",
    model: "Daily 3.0",
    name: "adidas Daily 3.0 Sneaker (Navy Blue)",
    leather: "Navy canvas sneaker",
    allowedMonths: [5, 6, 7, 8, 9],
    idealTempF: [80, 105],
    tags: ["hot-ok", "shorts", "casual"],
    signature: "Casual navy sneaker alternative",
    limiter: "Not a boot — only makes sense on genuinely hot, casual days",
    outfit:
      "Are you sure you want Red Wings today? The adidas Daily 3.0 in navy is a clean, low-key sneaker for a laid-back hot day — Dearborn Long Ryder Jeans or shorts and the Marine Layer Banks Tee, nothing more needed.",
    matchKeywords: ["sneakers", "navy sneakers", "adidas", "tee", "t-shirt", "jeans", "shorts", "casual"],
  },
];
