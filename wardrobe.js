// Kirk's wardrobe outside of Red Wing boots. Used as extra context for the
// AI outfit matcher (netlify/functions/match-outfit.mjs) so it can recognize
// specific owned pieces by name/brand and reason about their color, fabric,
// and formality — rather than only matching generic terms like "flannel."
//
// This is a static snapshot — update it by hand as the closet changes.

export const WARDROBE = {
  shortSleeveShirts: [
    "Carhartt Flex Blue Plaid",
    "Carhartt Multicolor Plaid",
    "Hammer Made Custer",
    "Hammer Made Hunza",
    "JCRT Catcher in the Rye",
    "JCRT Dazed and Confused",
    "JCRT Loveless Plaid (pink / grey / black)",
    "J.Crew Gauze Chambray",
    "Kuhl Short Sleeve",
    "Marine Layer Banks Tee (Mood Indigo)",
    "Penguin Heritage Blue / Pale Red",
    "Penguin Heritage Blue Plaid",
    "Quince Linen Navy",
    "Quince Linen Natural",
  ],
  longSleeveShirts: [
    "Hammer Made Banff",
    "Hammer Made Black / Blue / Red / Grey Plaid",
    "Hammer Made Ripley Hoodie (lightweight hooded long sleeve tee)",
    "Hammer Made Tomas Crewneck (Green)",
    "Brooks Brothers PBDC Checked Shirt (Navy / Purple)",
    "Brooks Brothers Yard Work Plaid (Blue / Red)",
    "Brooks Brothers Button Down",
    "JCRT Sunshine Rock Flannel",
    "JCRT London Calling Plaid",
    "Marine Layer Pacifica Stretch Twill Overshirt (Pink Multi Plaid)",
    "Marine Layer Corduroy Shirt (Blue / Green)",
    "Carhartt Midweight Plaid",
    "Joseph Abboud Grey / Field Tan Plaid",
    "Jockey Outdoor Luke Bryan Henley (Smokey Haze)",
  ],
  sweatshirtsAndCasualLayers: [
    "Marine Layer Corbet Quilted Full Zip (Dark Heather Grey)",
    "Warrior Butter Pullover Hoodie (Dark Carbon)",
    "Hammer Made Tomas Crewneck (Green)",
    "Hammer Made Ripley Hoodie",
    "Velour Tracksuit Jacket (Navy)",
  ],
  outerwear: {
    jackets: [
      "Iron & Resin Hunter Jacket (Tan Waxed Canvas, shearling collar)",
      "Iron & Resin Rambler Jacket (Beige Corduroy)",
      "Quince Corduroy Chore Jacket (Seaweed / olive brown)",
      "Canada Goose Chateau Parka (Black)",
      "Tasso Elba Quilted Jacket (Grey, brown faux suede shoulders & elbows)",
      "Cotopaxi Capa Hooded Insulated Jacket (Maritime / Chestnut)",
    ],
    vests: [
      "Carhartt Rain Defender Insulated Vest (Black)",
      "Quince Hybrid Insulated Vest (Navy)",
      "Vineyard Vines Lightweight Packable Vest (Red)",
    ],
  },
  pants: [
    "The Perfect Jean (Cowboy Wash)",
    "Big Star Union (Grey)",
    "Banana Republic Athletic Travel Pant (Whiskey)",
    "UNRL Halifax Pant (Stone)",
    "Mugsy Mags (Black)",
    "32 Degrees Pants (Light Tan)",
    "Dearborn Long Ryder Jeans",
    "Uniqlo Selvedge Jeans (Navy)",
  ],
  shorts: [
    "01.algo Performance Shorts (Tan)",
    "Waggle Shorts (Mocha)",
    "Greg Norman Shorts (Navy)",
  ],
  footwearNonRedWing: {
    sneakers: ["adidas VL Court 3.0 (White / Black)", "adidas Daily 3.0 Sneaker (Navy Blue)"],
    sandals: ["Birkenstock Kyoto (Desert Buck Nubuck)"],
  },
  eyewear: {
    eyeglasses: [
      "David Beckham DB1018 (Gray Horn)",
      "Warby Parker Hardy (Striped Pacific)",
    ],
    sunglasses: [
      "Zenni Stone Cold (Gradient Amber)",
      "Zenni Amber Aviators",
      "Zenni Blue Aviators",
      "Warby Parker Sutton",
    ],
  },
  watches: ["Tag Heuer Link", "Apple Watch (Black band)"],
};
