/**
 * All customer-facing copy. Components read from here instead of hard-coding strings, so the
 * owner can change wording in one place (and a 中文 version can be added later).
 * `{name}`-style placeholders are filled with `fill()`.
 */
export const messages = {
  brand: {
    name: "Ironbark Fidgets",
    tagline: "Machined metal fidgets, shipped from Australia.",
    legal: "Ironbark Fidgets is a trading name of BASK ADVENTURE PTY LTD, ABN 18 688 825 532.",
    email: "hello@ironbarkfidgets.com.au",
    instagram: "https://www.instagram.com/ironbarkfidgets",
    tiktok: "https://www.tiktok.com/@ironbarkfidgets",
  },
  announcement: "Free shipping over {threshold} · Ships from Australia",
  nav: {
    shop: "Shop",
    boxes: "Kits",
    about: "About",
    cart: "Cart",
    cartCount: "Cart, {count} items",
    menu: "Menu",
    home: "Home",
    search: "Search",
    shopAll: "Shop all",
  },
  footer: {
    shop: "Shop",
    help: "Help",
    follow: "Follow the spin",
    allProducts: "All products",
    links: {
      safety: "Safety & care",
      shipping: "Shipping & returns",
      faq: "Questions & answers",
      guides: "Guides",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
    },
  },
  home: {
    heroTitle: "Built tough. Made to fidget.",
    heroText:
      "Machined metal spinners, sliders, haptic coins and gear fidgets for your desk and pocket. Heavy in the hand, quiet in the meeting, shipped from Australia.",
    heroCta: "Shop fidgets",
    heroSecondary: "See kits",
    collectionsTitle: "Shop by category",
    boxesTitle: "Kits",
    boxesText: "A few favourites together, for less than buying them one by one.",
    newTitle: "New and popular",
    viewAll: "View all",
    why: [
      { title: "Ships from Australia", text: "Packed at home and sent with Australia Post." },
      {
        title: "Honest materials",
        text: "Aluminium, brass, zinc or steel: every page says which. Age 14+.",
      },
      {
        title: "Free shipping over {threshold}",
        text: "Flat {flat} under that, anywhere in Australia.",
      },
    ],
    socialTitle: "Hear the click",
    socialText:
      "Close-ups, sound tests, new drops and restocks on TikTok and Instagram: @ironbarkfidgets",
    waitlistTitle: "Be first to the next drop",
    waitlistText: "New designs sell out fast. Get an email when they land (no spam, promise).",
    christmas:
      "Shopping for Christmas? Order by {date} for delivery before Christmas (NT and regional areas: order a few days earlier).",
  },
  waitlist: {
    label: "Email address",
    placeholder: "you@example.com",
    submit: "Notify me",
    sending: "Saving…",
    consent: "We'll email you about drops and restocks. Unsubscribe any time.",
    success: "You're on the list! We'll email you when the next drop lands.",
    successItem: "Done! We'll email you when it's back.",
    invalid: "That email doesn't look right. Please check it.",
    error: "Sorry, that didn't save. Please try again in a minute.",
  },
  shop: {
    title: "Shop all",
    description: "Every fidget we stock, in one place.",
    sortLabel: "Sort",
    sorts: {
      featured: "Featured",
      "price-asc": "Price: low to high",
      "price-desc": "Price: high to low",
    },
    count: "{count} products",
    countOne: "1 product",
    empty: "Nothing here yet. Check back soon.",
    all: "All",
    categories: "Categories",
    breadcrumb: "Breadcrumb",
    filters: "Filters",
    filtersCount: "Filters ({count})",
    showResults: "Show {count} products",
    showOne: "Show 1 product",
    clearAll: "Clear all",
    remove: "Remove filter: {name}",
    selected: "(selected)",
    priceTitle: "Price",
    prices: {
      "under-10": "Under $30",
      "10-20": "$30 to $50",
      "20-40": "$50 to $80",
      "40-plus": "$80 and up",
    },
    availability: "Availability",
    inStock: "In stock only",
    noMatch: "Nothing matches these filters.",
  },
  search: {
    title: "Search",
    label: "Search the shop",
    placeholder: "Try “slider”, “brass” or “gear”",
    button: "Search",
    resultsFor: "Results for “{q}”",
    prompt: "What are you looking for?",
    none: "No fidgets match “{q}”. Try another word, or browse a category:",
  },
  reviews: {
    title: "Reviews",
    count: "{count} reviews",
    one: "1 review",
    average: "{avg} out of 5",
    verified: "Verified buyer",
    none: "No reviews yet. Bought one? You can review it from your account once it's posted.",
    all: "All",
    withPhotos: "With photos ({count})",
    write: "Write a review",
    photoAlt: "Customer photo of {item}",
    policy:
      "Reviews are from customers who bought and received the item. We publish every honest review, good or bad.",
  },
  product: {
    from: "From {price}",
    was: "Was {price}",
    save: "Save {amount}",
    badges: {
      new: "New",
      bestseller: "Bestseller",
      test: "TEST",
      low: "Only {count} left",
      lowShort: "Low stock",
      soldOut: "Sold out",
    },
    design: "Design",
    designs: "{count} designs",
    quantity: "Quantity",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    addToCart: "Add to cart",
    added: "Added to cart",
    inStock: "In stock, ships in 1 business day",
    soldOutTitle: "Sold out",
    notifyText: "We'll email you when this is back.",
    photo: "Photo {n} of {total}",
    shipping: "Flat {flat} shipping in Australia. Free over {threshold}. Express Post {express}.",
    related: "You might also like",
    inBoxes: "Also in these kits",
    placeholderPhotos: "Sample photos. Final product photos coming soon.",
    buy: {
      label: "Buy",
      single: "Single",
      box: "Pack of {count}",
      boxLabel: "Pack of {count}",
      singleRandom: "Comes in different designs. We pick one for you at random.",
      boxHint: "A pack of {count} pieces.",
      boxHintMixed: "One of each design: {count} pieces.",
      boxesLeft: "Only {count} packs left",
      boxLeft: "Only 1 pack left",
    },
    video: {
      title: "Watch it spin",
      play: "Play video: {name}",
      note: "Plays from YouTube. Tap for sound.",
    },
    gallery: {
      label: "Product photos",
      previous: "Previous photo",
      next: "Next photo",
      enlarge: "Open photo {n} full screen",
      close: "Close",
    },
  },
  cart: {
    title: "Your cart",
    open: "Open cart",
    empty: "Your cart is empty.",
    emptyShop: "Shop fidgets",
    emptyBoxes: "See kits",
    remove: "Remove {name}",
    loading: "Updating prices…",
    soldOut: "Sold out. Remove it to check out.",
    unavailable: "No longer available. Remove it to check out.",
    /** Name for a line whose item is gone (deleted, hidden or a test item on the real shop). */
    unavailableName: "Removed item",
    reduced: "Only {count} left, so we've changed the quantity.",
    blind: "{count} random designs",
    randomColour: "Random design",
    fullBox: "Pack of {count}",
    subtotal: "Subtotal",
    shipping: "Shipping",
    shippingFree: "Free",
    total: "Total",
    gstIncluded: "Includes GST",
    freeShippingGap: "Add {amount} for free shipping",
    freeShippingDone: "You've got free shipping!",
    checkout: "Checkout",
    redirecting: "Taking you to payment…",
    promoNote: "Promo codes can be entered on the next step.",
    expressNote: "Need it fast? Choose Express Post ({price}) on the next step.",
    shippingExpress: "Shipping (Express Post)",
    errorSoldOut: "Sorry, {name} just sold out. We've updated your cart.",
    errorUnavailable: "Sorry, {name} is no longer available.",
    /** Phase 12: only on preview / the laptop, where only TEST products can be bought. */
    errorTestOnly:
      "This is the test site: only TEST products can be bought. Remove {name} to check out.",
    errorLimit: "That's more than we can sell in one order (max {max} items, {perLine} of each).",
    errorStripe: "Couldn't start checkout. Please try again in a minute.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  checkout: {
    /** Phase 14: optional note on Stripe's checkout page (label ≤ 50 characters). */
    note: {
      label: "Note for your order",
      hint: "Random designs are picked from what's in stock. We'll try to follow requests in your note but can't promise.",
      yours: "Your note",
      owner: "💬 Customer note",
    },
    successTitle: "Thank you! Order {number}",
    successText:
      "We'll post it with Australia Post within 1–2 business days. Your receipt is on its way from Stripe.",
    confirmingTitle: "Confirming your payment…",
    confirmingText: "This usually takes a few seconds.",
    confirmingSlow: "Still confirming. We'll email you as soon as it's through.",
    expiredTitle: "This checkout has expired",
    expiredText: "No payment was taken. Your cart is still here if you'd like to try again.",
    cancelledTitle: "No payment was taken",
    cancelledText: "Your cart is still here whenever you're ready.",
    backToCart: "Back to cart",
    keepShopping: "Keep shopping",
    items: "Items",
    shipTo: "Shipping to",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    total: "Total (incl. GST)",
  },
  email: {
    footerLegal:
      "Ironbark Fidgets is a trading name of BASK ADVENTURE PTY LTD, ABN 18 688 825 532.",
    footerContact: "Questions? Just reply to this email or write to {email}.",
    unsubscribe: "Unsubscribe",
    order: {
      subject: "Your Ironbark Fidgets order details · {number}",
      preview: "Thanks for your order! Here's what's coming your way.",
      heading: "Thanks for your order!",
      intro:
        "Hi {name}, we've got your order {number} and we'll post it with Australia Post within 1–2 business days. We'll email you the tracking number when it's on its way.",
      items: "Your order",
      surprise: "{count} surprise designs (no peeking!)",
      subtotal: "Subtotal",
      discount: "Discount",
      shipping: "Shipping",
      shippingExpress: "Shipping (Express Post)",
      free: "Free",
      total: "Total",
      gst: "Includes GST of {amount}",
      shipTo: "Shipping to",
      returns:
        "Something wrong when it arrives? Reply to this email with a photo and we'll sort out a replacement or refund. Your rights under Australian Consumer Law always apply.",
      care: "Keep your fidgets away from young children and pets: they have small parts.",
    },
    alert: {
      subject: "New order {number} · {total}",
      subjectExpress: "EXPRESS · New order {number} · {total}",
      express: "Express Post: send with an Express Post satchel.",
      heading: "New order {number}",
      pack: "To pack",
      boxes: "Order lines",
      customer: "Customer",
      shipTo: "Ship to",
      stripe: "Open in Stripe",
    },
    shipped: {
      subject: "Your Ironbark Fidgets order {number} is on its way",
      preview: "Your fidgets are on the way!",
      heading: "It's on its way!",
      intro: "Hi {name}, your order {number} is with Australia Post.",
      tracking: "Tracking number: {number}",
      track: "Track your parcel",
      items: "In the parcel",
    },
    backInStock: {
      subject: "{name} is back in stock",
      preview: "The one you were waiting for is back.",
      heading: "It's back!",
      intro: "{name} is back in stock at Ironbark Fidgets.",
      low: "Only {count} left, so don't wait too long.",
      cta: "Shop now",
      why: "You're getting this because you asked us to tell you when {name} was back. We won't email you about it again.",
    },
    reviewRequest: {
      subject: "How are your fidgets?",
      preview: "Tell other fidgeters what you think. It takes a minute.",
      heading: "How are your fidgets?",
      intro:
        "Hi {name}, your order {number} should have arrived by now. We'd love to hear what you think, good or bad. Every honest review gets published.",
      introNoName:
        "Your order {number} should have arrived by now. We'd love to hear what you think, good or bad. Every honest review gets published.",
      cta: "Write a review",
      signIn: "You'll sign in with a one-time code sent to this email address. No password needed.",
      problem: "Something wrong with your order? Just reply to this email and we'll sort it out.",
      why: "You're getting this because you bought from Ironbark Fidgets. We only ask once per order.",
    },
    launch: {
      subject: "Ironbark Fidgets is open!",
      preview: "Machined metal fidgets, shipped from Australia.",
      heading: "We're open!",
      intro:
        "Thanks for joining the waitlist. Ironbark Fidgets is now open: machined metal spinners, sliders, haptic coins and gear fidgets, shipped from Australia.",
      code: "Waitlist thank-you: use code {code} at checkout.",
      cta: "Start shopping",
      featured: "A few favourites",
      why: "You're getting this because you joined the Ironbark Fidgets waitlist.",
    },
  },
  invoice: {
    taxTitle: "Tax invoice",
    title: "Invoice",
    legalName: "BASK ADVENTURE PTY LTD",
    abn: "ABN 18 688 825 532",
    number: "Invoice number",
    date: "Date",
    billTo: "Bill to",
    shipTo: "Ship to",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    shippingExpress: "Shipping (Express Post)",
    free: "Free",
    total: "Total (AUD)",
    gst: "Includes GST",
    gstNote: "All prices include GST.",
    paid: "Paid in full by card on {date}.",
    refunded: "Refunded on {date}.",
    download: "Download tax invoice (PDF)",
    downloadPlain: "Download invoice (PDF)",
  },
  account: {
    title: "My account",
    navLabel: "My account",
    signIn: {
      title: "Sign in to see your orders",
      text: "No password needed. We'll email you a code. You can still check out as a guest any time.",
      email: "Email",
      sendCode: "Email me a code",
      sending: "Sending…",
      codeTitle: "Check your inbox",
      codeText: "We sent a code to {email}. It works for 1 hour.",
      code: "Code",
      verify: "Sign in",
      verifying: "Checking…",
      otherEmail: "Use a different email",
      resend: "Send a new code",
      or: "or",
      google: "Continue with Google",
      invalidEmail: "Please enter a valid email address.",
      badCode: "That code didn't work. Check the latest email, or send a new code.",
      tooMany: "Too many codes in a short time. Please wait a few minutes and try again.",
      sendFailed: "Couldn't send the code. Please try again in a minute.",
      googleFailed: "Google sign-in didn't work. Please try again, or use an email code.",
      privacy: "By signing in you agree to our privacy policy.",
    },
    signedInAs: "Signed in as {email}",
    signOut: "Sign out",
    settings: "Settings",
    reviews: "Reviews",
    orders: {
      title: "Your orders",
      empty: "No orders yet with {email}.",
      emptyCta: "Start shopping",
      guestNote:
        "Orders you placed as a guest with this email show up here too. Used a different email? Sign in with that one.",
      items: "{count} items",
      item: "1 item",
      view: "View order",
      placed: "Placed {date}",
    },
    status: {
      paid: "Getting packed",
      packed: "Packed, posting soon",
      shipped: "On its way",
      refunded: "Refunded",
    },
    order: {
      back: "All orders",
      title: "Order {number}",
      tracking: "Track with Australia Post",
      trackingNumber: "Tracking number {number}",
      notShipped: "We post within 1–2 business days. You'll get an email with tracking.",
      surprise: "{count} surprise designs",
      picks: "Your picks: {names}",
      buyAgain: "Buy again",
      buyAgainDone: "Added to your cart",
      buyAgainNone: "These items aren't available right now.",
      help: "Need help with this order?",
      helpSubject: "Order {number}",
      timeline: { paid: "Paid", packed: "Packed", shipped: "Posted", refunded: "Refunded" },
    },
    settingsPage: {
      title: "Settings",
      nameTitle: "Your name",
      nameText: "Shown on your reviews as first name and last initial, e.g. “Mia K.”",
      nameLabel: "Name",
      save: "Save",
      saving: "Saving…",
      saved: "Saved.",
      nameInvalid: "Letters, spaces, hyphens and apostrophes only (max 60).",
      saveFailed: "Couldn't save. Please try again.",
      emailsTitle: "Email preferences",
      emailsText: "Order emails (confirmation, shipping) always come. These are the extras:",
      waitlist: "Drops and news (waitlist)",
      backInStock: "Tell me when {item} is back",
      sentNote: "already sent",
      none: "You're not signed up for any extra emails.",
      allOffButton: "Stop all marketing emails",
      allOff: "Done. No more drop or restock emails.",
      deleteTitle: "Delete my account",
      deleteText:
        "This removes your sign-in and your email sign-ups straight away. We keep your order records for 5 years because tax law requires it; they're no longer linked to a login.",
      deleteConfirm: "Type DELETE to confirm",
      deleteButton: "Delete my account",
      deleteConfirmError: "Type DELETE in capitals to confirm.",
      deleted: "Your account has been deleted. You can still shop as a guest any time.",
    },
    reviewsPage: {
      title: "Reviews",
      toReview: "Ready to review",
      toReviewText:
        "Things from your posted orders. Every honest review is published, good or bad.",
      nothingToReview:
        "Nothing to review right now. Once an order is posted, its fidgets show up here.",
      write: "Write a review",
      edit: "Edit",
      cancel: "Cancel",
      mine: "Your reviews",
      noneYet: "You haven't written any reviews yet.",
      rating: "Your rating",
      stars: "{count} out of 5 stars",
      titleLabel: "Title (optional)",
      bodyLabel: "Your review",
      bodyHint: "10–1,000 characters. How does it feel? Weight, sound, smoothness, finish?",
      photoLabel: "Photo (optional)",
      photoHint: "Photos are checked before they show. Please no faces or personal details.",
      submit: "Post review",
      saving: "Posting…",
      posted: "Thanks! Your review is live.",
      postedPhoto: "Thanks! Your review is live. The photo shows once we've checked it.",
      invalid: "Pick a star rating and write at least 10 characters.",
      notEligible: "You can review things from your posted orders, once each.",
      failed: "Couldn't save. Please try again.",
      delete: "Delete",
      deleteConfirm: "Delete this review?",
      deleted: "Review deleted.",
      photoWaiting: "Photo waiting for a check",
      hidden:
        "Hidden: {reason}. Edit it, or reply to any of our emails if you think this is a mistake.",
      showAs: "Shown as “{name}” with a Verified buyer badge. Change your name in Settings.",
      fallbackName: "Fidgeter",
      view: "See it on the shop",
    },
  },
  unsubscribe: {
    title: "Unsubscribe",
    question:
      "Stop all Ironbark Fidgets emails to {email}? (Order emails will still come if you buy something.)",
    button: "Unsubscribe",
    done: "Done. {email} won't get any more drop or restock emails from us.",
    invalid:
      "This unsubscribe link isn't valid. Reply to any of our emails and we'll remove you by hand.",
  },
  safety: {
    title: "Safety & care",
    age: "Age {age}+",
    material: "Material",
    size: "Size",
    smallParts: "Not suitable for children under 3. Small parts.",
    heat: "Metal parts and magnets are fixed in place. Stop using it if a part comes loose.",
    mouth: "Not a toy for young children. Keep away from children under 14 and pets.",
    reports: "Supplier material details and test reports on file. Ask us for a copy.",
    more: "Safety & care guide",
  },
  box: {
    listTitle: "Kits",
    listText: "Ready-made kits of favourites, for less than buying them one by one.",
    listEmpty: "Kits are coming soon. Meanwhile, every fidget is in the shop.",
    listEmptyCta: "Shop all fidgets",
    contents: "What's inside",
    possible: "Possible designs",
    mysteryNote:
      "{count} designs picked at random for you. Always different designs, unless only a few are left in stock.",
    mysteryBadge: "Blind box",
    itemsCount: "{count} items",
    saveVsSingles: "Save {amount} vs buying singly",
    soldOutBecause: "One of the items inside is out of stock.",
    available: "{count} boxes left",
    back: "Back to kits",
  },
  pages: {
    about: {
      title: "About Ironbark Fidgets",
      intro:
        "Ironbark is one of the hardest Australian hardwoods. We wanted fidgets that feel the same way: solid, heavy in the hand and built to last.",
      body: [
        "We're a small Australian business. We pick every design ourselves, check each batch for spin, rattle, edges and finish before it goes on the shelf, and pack every order at home.",
        "Our fidgets are for teens and grown-ups (14+): something solid to keep your hands busy at the desk, in a meeting or on the train.",
      ],
    },
    safety: {
      title: "Safety & care",
      intro: "Metal fidgets are built to last, and a few simple rules keep them safe.",
      sections: [
        {
          title: "Who they're for",
          items: [
            "Our products are for ages 14 and up. They're desk and pocket fidgets for teens and adults, not toys for young children.",
            "Not suitable for children under 3: small parts can be a choking hazard.",
            "Keep away from babies, toddlers and pets.",
          ],
        },
        {
          title: "Magnets and small parts",
          items: [
            "Some fidgets have magnets or ball bearings fixed inside. They're not meant to come out.",
            "If a magnet, ball or screw comes loose, stop using it, keep the part away from children and email us for a replacement.",
            "If you think a child has swallowed a magnet or a small part, get medical help straight away.",
          ],
        },
        {
          title: "Look after them",
          items: [
            "Don't put them in your mouth. Wipe with a dry cloth; keep them dry to stop marks on the finish.",
            "Check now and then that screws are tight and nothing rattles loose.",
            "Don't throw them or spin them near faces. Heavy metal pieces can hurt if dropped on a foot.",
          ],
        },
        {
          title: "Test reports",
          items: [
            "We buy from suppliers who can tell us what each piece is made of (aluminium, zinc alloy, brass or steel) and show test paperwork where they have it.",
            "We keep these on file. Want to see one for a product? Email {email} and we'll send you a copy.",
          ],
        },
      ],
      poisons:
        "If someone swallows part of a toy or feels unwell after contact, call the Poisons Information Centre on 13 11 26 (24/7). In an emergency, call 000.",
      materials:
        "Every product page lists its material and size. Ask us any time for more detail: {email}.",
    },
    shipping: {
      title: "Shipping & returns",
      description:
        "Australia-wide shipping with Australia Post, packed within 1 business day. Free shipping on bigger orders, Express Post, easy returns.",
      sections: [
        {
          title: "Shipping",
          items: [
            "We ship anywhere in Australia with Australia Post.",
            "Standard: flat {flat} per order, free on orders over {threshold}.",
            "Express Post: {express} per order, any size. Usually 1–3 business days to most addresses. Choose it at checkout.",
            "Orders are packed within 1 business day. You'll get an email with tracking when it's on its way.",
            "We don't ship overseas yet.",
          ],
        },
        {
          title: "Returns",
          items: [
            "If something arrives damaged, is faulty, or isn't what you ordered, we'll replace it or refund you. Just email us a photo within 30 days.",
            "Changed your mind? Unused items in original packaging can be returned within 14 days for a refund (return postage is on you).",
            "Faulty items are always covered, including a fidget that rattles, sticks or arrives with a loose part.",
          ],
        },
        {
          title: "How to return something",
          items: [
            "Email {email} with your order number (it starts with IB-) and, for a damaged or faulty item, a photo.",
            "We'll reply within 1 business day with what to do next. For a faulty or wrong item we usually don't need it back; if we do, we pay the postage.",
            "Refunds go back to the card you paid with. We refund within 2 business days of receiving your return (or of your photo, for faulty items); your bank can take another 3–10 business days to show it.",
          ],
        },
        {
          title: "Lost or late parcels",
          items: [
            "If your tracking hasn't moved for a week, or the parcel says delivered but isn't there, email us. We'll chase it with Australia Post and send a replacement or refund if it's lost.",
          ],
        },
      ],
      acl: "Our goods come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure. Nothing on this page limits those rights.",
    },
    faq: {
      title: "Questions & answers",
      description:
        "Everything about our metal fidgets: materials, safety and care, colours, shipping in Australia, returns and gifts.",
      intro:
        "The things people ask us most. Can't find your answer? Email {email} and we'll reply within 1 business day.",
      groups: [
        {
          title: "About our fidgets",
          items: [
            {
              q: "What is an EDC fidget?",
              a: "EDC means everyday carry: small things you keep on you every day. EDC fidgets are pocket-sized metal pieces made for your hands to play with: spinners, sliders, haptic coins, rings and gear fidgets. People use them at the desk, in meetings, on calls or instead of reaching for their phone.",
            },
            {
              q: "What are they made of?",
              a: "Mostly aluminium alloy, zinc alloy, brass or stainless steel, with steel bearings and magnets fixed inside. Every product page says which metal. We don't call something titanium unless it is.",
            },
            {
              q: "What's the difference between a spinner, a slider and a haptic coin?",
              a: "A spinner turns on a bearing. A slider is two or three plates you push with your thumb; magnets snap them into place with a click. A haptic coin is a coin-sized piece that clicks or snaps as you turn or press it. Gear fidgets have parts that turn together.",
            },
            {
              q: "Are they quiet?",
              a: "Spinners are close to silent. Sliders and haptic coins click, which is the point. Each product page says whether it's quiet or clicky.",
            },
            {
              q: "Are fidgets good for focus?",
              a: "Lots of people like having something to do with their hands while they work, read or listen. They're a fidget, not a treatment, and we don't make health claims.",
            },
            {
              q: "How big and heavy are they?",
              a: "It depends on the piece. Every product page lists its size, weight and material.",
            },
          ],
        },
        {
          title: "Safety and care",
          items: [
            {
              q: "Are they safe for kids?",
              a: "They're for ages 14 and up. They contain small parts, and some have magnets fixed inside, so keep them away from young children and pets. See our Safety & care page.",
            },
            {
              q: "How do I look after a metal fidget?",
              a: "Keep it dry and wipe it with a soft cloth. A drop of light oil keeps a bearing smooth. Check now and then that screws are tight.",
            },
            {
              q: "What if a part comes loose?",
              a: "Stop using it, keep the part away from children, and email us a photo. We'll replace it or refund you.",
            },
          ],
        },
        {
          title: "Designs, packs and ordering",
          items: [
            {
              q: "Can I choose the colour?",
              a: "Yes. Most fidgets come in a few colours or finishes. Pick one on the product page before you add it to your cart.",
            },
            {
              q: "What's a kit?",
              a: "A few fidgets together, for less than buying them one by one. The kit page shows exactly what's inside.",
            },
            {
              q: "Is it the same as the photo?",
              a: "Yes, the colour you pick is the one we send. Metal finishes can look a little different in different light.",
            },
            {
              q: "Something's sold out. Will it come back?",
              a: "Usually, yes. Pop your email in on the product page and we'll email you once when it's back in stock.",
            },
            {
              q: "Do I need an account?",
              a: "No. You can check out as a guest. An account (no password, we email you a code) lets you see all your orders and write reviews.",
            },
            {
              q: "How do I pay?",
              a: "By card on Stripe's secure checkout page. Prices are in Australian dollars and include GST, and you get a tax invoice by email. We never see your full card number.",
            },
            {
              q: "I have a discount code. Where do I use it?",
              a: "Enter it on the checkout page, before you pay. One code per order.",
            },
            {
              q: "Can I send a fidget as a gift?",
              a: 'Yes. Enter their address at checkout and use the note box for anything we should know, such as "It\'s a gift". Our kits make easy presents.',
            },
            {
              q: "Do you do corporate gifts, engraving or wholesale?",
              a: "Email {email} with what you need and how many, and we'll get back to you.",
            },
          ],
        },
        {
          title: "Shipping",
          items: [
            {
              q: "Where do you ship from?",
              a: "From Melbourne, Victoria. We pack every order ourselves and send it with Australia Post.",
            },
            {
              q: "How much is shipping?",
              a: "Standard is a flat {flat} per order anywhere in Australia, and free on orders over {threshold}. Express Post is {express}.",
            },
            {
              q: "How long does shipping take?",
              a: "We pack within 1 business day. Australia Post usually delivers in 2–6 business days depending on where you are. In a hurry? Choose Express Post at checkout (usually 1–3 business days).",
            },
            {
              q: "When should I order for Christmas?",
              a: "Order by {christmas} for delivery before Christmas with standard shipping (NT and regional areas: a few days earlier). Express Post gives you a little more time.",
            },
            {
              q: "How do I track my order?",
              a: "We email you a tracking link when your parcel is on its way. With an account, your orders and tracking are also under Your orders.",
            },
            {
              q: "Do you ship overseas?",
              a: "Not yet. We ship within Australia only.",
            },
          ],
        },
        {
          title: "Returns and refunds",
          items: [
            {
              q: "My order arrived damaged or wrong. What do I do?",
              a: "Email {email} within 30 days with your order number (it starts with IB-) and a photo. We'll replace it or refund you, and usually don't need it back.",
            },
            {
              q: "Can I return something if I change my mind?",
              a: "Yes, unused items in their original packaging within 14 days (return postage is on you). Faulty items are always covered.",
            },
            {
              q: "How long does a refund take?",
              a: "We refund within 2 business days of getting your return (or your photo, for faulty items). Your bank can take another 3–10 business days to show it.",
            },
          ],
        },
        {
          title: "About us",
          items: [
            {
              q: "Who is Ironbark Fidgets?",
              a: "A small Australian online shop for machined metal fidgets. We pick every design ourselves and check each batch for spin, rattle and finish. Ironbark Fidgets is a trading name of BASK ADVENTURE PTY LTD (ABN 18 688 825 532), Victoria.",
            },
            {
              q: "How do I contact you?",
              a: "Email {email}. We usually reply within 1 business day. You can also message us on Instagram or TikTok (@ironbarkfidgets).",
            },
          ],
        },
      ],
    },
    guides: {
      title: "Guides",
      description:
        "Short guides to metal fidgets from an Australian shop: types, materials, care and gift ideas.",
      intro:
        "Helpful reads about metal fidgets: what to buy, how to look after them and gift ideas.",
      updated: "Updated {date}",
      all: "All guides",
    },
    contact: {
      title: "Contact",
      intro: "Questions about an order, a product or wholesale? We'd love to hear from you.",
      emailLabel: "Email",
      socialLabel: "Socials",
      reply: "We usually reply within 1 business day.",
    },
    privacy: {
      title: "Privacy policy",
      intro:
        "Ironbark Fidgets is a small Australian shop. We collect only what we need to send you your order and keep you posted, we never sell your details, and we don't use advertising or tracking cookies.",
      updated: "Last updated 6 November 2026.",
      sections: [
        {
          title: "Who we are",
          items: [
            "Ironbark Fidgets is a trading name of BASK ADVENTURE PTY LTD (ABN 18 688 825 532), Victoria, Australia. Questions about your privacy: {email}.",
          ],
        },
        {
          title: "What we collect",
          items: [
            "When you order: your name, email, delivery address, phone number (if you give one), what you bought and what you paid.",
            "Card details go straight to Stripe, our payment provider. We never see or store your full card number.",
            "If you create an account: your email, your name (if you add one) and how you sign in (email code or Google). We never see your Google password.",
            "If you sign up for the launch list or a back-in-stock alert: your email and which item you're waiting for.",
            "If you write a review: your rating, your words and any photo you add.",
            "If you email us: your message and our reply.",
            "Our hosting keeps short-lived technical logs (such as IP address and browser) to keep the site secure and working.",
          ],
        },
        {
          title: "How we use it",
          items: [
            "To take payment, pack and post your order, and email you the order details, tax invoice and tracking.",
            "To answer your questions and handle returns and refunds.",
            "To send emails you asked for (launch news, back-in-stock alerts) and, about a week after your order ships, one email asking for a review. Every one of these has an unsubscribe link.",
            "To prevent fraud and keep the records Australian tax law requires.",
            "We don't sell or rent your details, and we don't share them with advertisers.",
          ],
        },
        {
          title: "Who we share it with",
          items: [
            "Only the services that run the shop, and only what each one needs: Stripe (payments), Australia Post (your name and address on the parcel), Supabase (our database, in Sydney), Vercel (website hosting), Resend (sending our emails) and Google (only if you sign in with Google).",
            "Some of these companies are based in the United States and may store or process data there. Each one protects it under its own privacy terms.",
            "Product videos are hosted on YouTube. Nothing loads from YouTube until you press play; when you do, YouTube (Google) may set its own cookies under Google's privacy policy.",
            "We'll also share information if the law requires it.",
          ],
        },
        {
          title: "Cookies and your browser",
          items: [
            "A sign-in cookie keeps you signed in to your account. Your cart is saved in your own browser so it's still there when you come back.",
            "We don't use advertising or tracking cookies.",
            "We count page visits with Vercel Web Analytics, which uses no cookies and doesn't identify you.",
          ],
        },
        {
          title: "Reviews",
          items: [
            "Reviews are public and show your first name and last initial, with a verified-buyer badge. You can edit or delete your reviews from your account at any time.",
            "Photos are checked by us before they appear.",
          ],
        },
        {
          title: "How long we keep it",
          items: [
            "Order records: 5 years, because Australian tax law requires it.",
            "Your account: until you delete it.",
            "Email sign-ups: until you unsubscribe or delete your account. If you unsubscribe, we keep a note of your email so we don't email you again.",
          ],
        },
        {
          title: "Your choices",
          items: [
            "Unsubscribe from any email with the link at the bottom, or in your account settings.",
            "Delete your account from Settings. This removes your sign-in and email sign-ups straight away; order records stay for tax. Delete your reviews first if you want them gone too, or ask us.",
            "Ask us for a copy of what we hold about you, or to correct it: {email}.",
          ],
        },
        {
          title: "Questions and complaints",
          items: [
            "Email {email} and we'll reply within 30 days. If you're not happy with our answer, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).",
            "If we change this policy, we'll update it here with a new date.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of sale",
      intro:
        "These terms apply when you buy from ironbarkfidgets.com.au. They're written in plain English; nothing in them takes away your rights under the Australian Consumer Law.",
      updated: "Last updated 6 November 2026.",
      sections: [
        {
          title: "Who you're buying from",
          items: [
            "Ironbark Fidgets is a trading name of BASK ADVENTURE PTY LTD (ABN 18 688 825 532), Victoria, Australia. Contact: {email}.",
          ],
        },
        {
          title: "Ordering",
          items: [
            "We deliver to Australian addresses only.",
            "To order you need to be 18 or over, or have a parent or guardian's permission.",
            "Your order is accepted when your payment goes through and we email your order details.",
            "We may cancel an order and refund it in full if an item turns out to be out of stock, a price or description on the site is clearly wrong, or the order looks fraudulent. We'll email you if this happens.",
          ],
        },
        {
          title: "Prices and payment",
          items: [
            "Prices are in Australian dollars and include GST. Shipping is shown at checkout before you pay.",
            "Payment is handled securely by Stripe. We don't see or store your full card number.",
            "One promo code per order. Promo codes have no cash value and can't be added after you've paid.",
          ],
        },
        {
          title: "Blind and mystery boxes",
          items: [
            "Designs in a blind or mystery box are picked at random when we pack your order. Every possible design is shown on the box page; we can't take requests or swap a design you didn't like.",
            "Faulty items are always covered (see Returns).",
          ],
        },
        {
          title: "Delivery",
          items: [
            "We post with Australia Post. Costs and times are on our Shipping & returns page. Delivery times are Australia Post's estimates, not guarantees.",
            "If your parcel is lost or arrives damaged, email us and we'll sort out a replacement or refund.",
          ],
        },
        {
          title: "Returns and refunds",
          items: [
            "See our Shipping & returns page for how returns work, including change-of-mind returns within 14 days.",
            "Our goods come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure.",
          ],
        },
        {
          title: "Product safety",
          items: [
            "Our fidgets are for ages 14 and up. They contain small parts and some have magnets fixed inside, so keep them away from young children and pets. See Safety & care for more.",
          ],
        },
        {
          title: "Reviews",
          items: [
            "Only customers who bought an item can review it. We publish every genuine review, good or bad. We only hide a review that is offensive, off-topic, shares someone's personal details or isn't about the product. Photos are checked before they appear.",
            "By posting a review you let us show it on our site.",
          ],
        },
        {
          title: "Accounts",
          items: [
            "Keep access to your email and Google account secure, since that's how you sign in. You can delete your account at any time (see our Privacy policy).",
          ],
        },
        {
          title: "Our responsibility",
          items: [
            "We're responsible for the products we sell as the Australian Consumer Law sets out. Beyond that, and as far as the law allows, we aren't liable for indirect losses.",
            "These terms are governed by the laws of Victoria, Australia. We may update them; the version on this page when you order is the one that applies to that order.",
          ],
        },
      ],
    },
    notFound: {
      title: "This one spun off somewhere",
      text: "We couldn't find that page.",
      cta: "Back to the shop",
    },
  },
};

export type Messages = typeof messages;

/** Fills `{key}` placeholders: fill("Save {amount}", { amount: "$5" }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
