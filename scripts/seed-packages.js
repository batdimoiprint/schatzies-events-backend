import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const TABLE = process.env.TABLE_NAME;
const NOW = new Date().toISOString();

// ---- Data ----

const PACKAGES = [
  // ============================================================
  // WEDDING PACKAGES
  // ============================================================
  {
    id: 'w-fascinating',
    eventType: 'Wedding',
    packageName: 'Fascinating Wedding Package',
    pax: [
      { id: 'w-fascinating-pax-100', pax: 100, paxPrice: 329000 },
      { id: 'w-fascinating-pax-150', pax: 150, paxPrice: 376500 },
      { id: 'w-fascinating-pax-200', pax: 200, paxPrice: 424000 },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'w-fascinating-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators with handheld radio' },
      { id: 'w-fascinating-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Event Planner' },
      { id: 'w-fascinating-pc-3', inclusionType: 'Professional Coordination', inclusion: '1 Lively Program host' },
      // Catering & Dining
      { id: 'w-fascinating-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet: Beef, Pork, Fish, Chicken, Vegetable, Pasta, Dessert, Drink and Rice' },
      { id: 'w-fascinating-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Tiffany Chairs or Glass Chairs' },
      { id: 'w-fascinating-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Couch for couple' },
      { id: 'w-fascinating-cd-4', inclusionType: 'Catering & Dining', inclusion: '3 Tier Fondant cake (only bottom is edible)' },
      { id: 'w-fascinating-cd-5', inclusionType: 'Catering & Dining', inclusion: '1 Bottle of Wine' },
      { id: 'w-fascinating-cd-6', inclusionType: 'Catering & Dining', inclusion: 'French fries' },
      { id: 'w-fascinating-cd-7', inclusionType: 'Catering & Dining', inclusion: 'Iced coffee bar' },
      { id: 'w-fascinating-cd-8', inclusionType: 'Catering & Dining', inclusion: 'French Fries station' },
      // Styling & Production
      { id: 'w-fascinating-sp-1', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment (non-trusses)' },
      { id: 'w-fascinating-sp-2', inclusionType: 'Styling & Production', inclusion: 'Entrance Tunnel' },
      { id: 'w-fascinating-sp-3', inclusionType: 'Styling & Production', inclusion: 'Elegant Backdrop' },
      { id: 'w-fascinating-sp-4', inclusionType: 'Styling & Production', inclusion: 'Guest Table centerpieces' },
      { id: 'w-fascinating-sp-5', inclusionType: 'Styling & Production', inclusion: 'VIP Table centerpieces' },
      { id: 'w-fascinating-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceremony: Use of Artificial Flowers, 6 pairs of Aisle Flowers, 6 pairs of lamps or Signages, 1 Entrance Arch, Loose Petals to shower after ceremony' },
      { id: 'w-fascinating-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System: Speakers, Amplifier, Microphone' },
      { id: 'w-fascinating-sp-8', inclusionType: 'Styling & Production', inclusion: '8 LED Par Lights' },
      { id: 'w-fascinating-sp-9', inclusionType: 'Styling & Production', inclusion: 'Party Poppers' },
      { id: 'w-fascinating-sp-10', inclusionType: 'Styling & Production', inclusion: 'LCD Projector with White Screen' },
      // Media & Glamour
      { id: 'w-fascinating-mg-1', inclusionType: 'Media & Glamour', inclusion: 'Photo & Video Coverage: Preparation to Ceremony to Reception' },
      { id: 'w-fascinating-mg-2', inclusionType: 'Media & Glamour', inclusion: '2 Photographers, 2 Videographers' },
      { id: 'w-fascinating-mg-3', inclusionType: 'Media & Glamour', inclusion: 'Prenup Pictorial with AVP' },
      { id: 'w-fascinating-mg-4', inclusionType: 'Media & Glamour', inclusion: '2 to 3 mins Save the Date video' },
      { id: 'w-fascinating-mg-5', inclusionType: 'Media & Glamour', inclusion: '20 pages 8x10 Magnetic Type Album (Leatherette with Box)' },
      { id: 'w-fascinating-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'w-fascinating-mg-7', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Bride and Groom (Airbrush)' },
      { id: 'w-fascinating-mg-8', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'w-fascinating-mg-9', inclusionType: 'Media & Glamour', inclusion: 'Photobooth: 2 Hours' },
      { id: 'w-fascinating-mg-10', inclusionType: 'Media & Glamour', inclusion: 'Bridal Car: 3 hours use (Hotel/Reception/Church) with Bridal car bouquet' },
      { id: 'w-fascinating-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Entourage Fresh Flowers: Bridal Bouquet, 6 Corsage for Principal Sponsors, 3 Mini Bouquet for Mothers and MOH, 3 Wristlet Bouquet for Bridesmaids, Buttoniers for all male partners' },
      { id: 'w-fascinating-mg-12', inclusionType: 'Media & Glamour', inclusion: 'Aerial / Drone Shot (wedding day)' },
    ],
  },

  {
    id: 'w-windy',
    eventType: 'Wedding',
    packageName: 'Windy Wedding Package',
    pax: [
      { id: 'w-windy-pax-100', pax: 100, paxPrice: 430000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-windy-pax-150', pax: 150, paxPrice: 510000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-windy-pax-200', pax: 200, paxPrice: 570000, note: 'Additional ₱1,500/head in excess of 100 pax' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'w-windy-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators' },
      { id: 'w-windy-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Event Planner' },
      { id: 'w-windy-pc-3', inclusionType: 'Professional Coordination', inclusion: '1 Program host' },
      // Catering & Dining
      { id: 'w-windy-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Rich Gold / Hizons Catering: Beef, Pork, Fish, Chicken, Vegetable, Pasta, Dessert, Drink and Rice' },
      { id: 'w-windy-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Tiffany or Glass Chairs' },
      { id: 'w-windy-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Couch for couple' },
      { id: 'w-windy-cd-4', inclusionType: 'Catering & Dining', inclusion: '3-tier fondant cake (bottom edible)' },
      { id: 'w-windy-cd-5', inclusionType: 'Catering & Dining', inclusion: '1 Bottle of Wine' },
      // Styling & Production
      { id: 'w-windy-sp-1', inclusionType: 'Styling & Production', inclusion: 'Entrance Tunnel and Elegant Backdrop' },
      { id: 'w-windy-sp-2', inclusionType: 'Styling & Production', inclusion: 'Guest & VIP Table centerpieces' },
      { id: 'w-windy-sp-3', inclusionType: 'Styling & Production', inclusion: 'Fairy lights dance floor' },
      { id: 'w-windy-sp-4', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: Max 40x40 Trusses with chandeliers' },
      { id: 'w-windy-sp-5', inclusionType: 'Styling & Production', inclusion: 'Ceremony: Artificial flowers, 6 pairs Aisle Flowers, 6 pairs lamps/signages, 1 Entrance Arch, Loose petals' },
      { id: 'w-windy-sp-6', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'w-windy-sp-7', inclusionType: 'Styling & Production', inclusion: '16 LED Par Lights, 4 Moving Heads' },
      { id: 'w-windy-sp-8', inclusionType: 'Styling & Production', inclusion: 'LED Wall: 9x12 high-quality' },
      // Media & Glamour
      { id: 'w-windy-mg-1', inclusionType: 'Media & Glamour', inclusion: '2 Photographers, 2 Videographers' },
      { id: 'w-windy-mg-2', inclusionType: 'Media & Glamour', inclusion: 'Prenup Pictorial with AVP' },
      { id: 'w-windy-mg-3', inclusionType: 'Media & Glamour', inclusion: '2-3 mins Save the Date video' },
      { id: 'w-windy-mg-4', inclusionType: 'Media & Glamour', inclusion: '20-page Magnetic Album (Leatherette with Box)' },
      { id: 'w-windy-mg-5', inclusionType: 'Media & Glamour', inclusion: '10-page Prenup Album' },
      { id: 'w-windy-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'w-windy-mg-7', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'w-windy-mg-8', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Bride & Groom (Airbrush) with unlimited retouch for pictorial, before ceremony, and second look for reception' },
      { id: 'w-windy-mg-9', inclusionType: 'Media & Glamour', inclusion: 'Bridal Car: 4 hours with chauffeur and Bridal car bouquet' },
      { id: 'w-windy-mg-10', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 3 hours, 20 pcs 4R frame, unlimited standee, free 15 mins stop time' },
      { id: 'w-windy-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Entourage Fresh Flowers: Bridal bouquet, 6 corsages for Principal Sponsors, 3 mini bouquets (Mothers and MOH), 3 wristlets for Bridesmaids, 3 flower baskets, Buttoniers for all male partners' },
    ],
  },

  {
    id: 'w-deluxe',
    eventType: 'Wedding',
    packageName: 'De Luxe Wedding Package',
    pax: [
      { id: 'w-deluxe-pax-100', pax: 100, paxPrice: 520000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-deluxe-pax-150', pax: 150, paxPrice: 585000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-deluxe-pax-200', pax: 200, paxPrice: 650000, note: 'Additional ₱1,500/head in excess of 100 pax' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'w-deluxe-pc-1', inclusionType: 'Professional Coordination', inclusion: '6 Event coordinators' },
      { id: 'w-deluxe-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Event Planner' },
      { id: 'w-deluxe-pc-3', inclusionType: 'Professional Coordination', inclusion: '1 Program host' },
      // Catering & Dining
      { id: 'w-deluxe-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Rich Gold / Hizons Catering – Upgraded Menu: 4 meat dishes, 2 pasta, 3 dessert, drink and rice' },
      { id: 'w-deluxe-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Tiffany or Glass Chairs' },
      { id: 'w-deluxe-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Couch for couple' },
      { id: 'w-deluxe-cd-4', inclusionType: 'Catering & Dining', inclusion: 'Welcome Treats: Grazing Table and Juice Bar' },
      { id: 'w-deluxe-cd-5', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible)' },
      { id: 'w-deluxe-cd-6', inclusionType: 'Catering & Dining', inclusion: '1 Bottle of Wine' },
      { id: 'w-deluxe-cd-7', inclusionType: 'Catering & Dining', inclusion: 'French fries' },
      { id: 'w-deluxe-cd-8', inclusionType: 'Catering & Dining', inclusion: 'Donut Wall' },
      // Styling & Production
      { id: 'w-deluxe-sp-1', inclusionType: 'Styling & Production', inclusion: 'High End Styling: Entrance Tunnel, Elegant Backdrop' },
      { id: 'w-deluxe-sp-2', inclusionType: 'Styling & Production', inclusion: 'Guest/VIP Table centerpieces (All Fabricated Flowers)' },
      { id: 'w-deluxe-sp-3', inclusionType: 'Styling & Production', inclusion: 'Wave table for 20 pax VIP' },
      { id: 'w-deluxe-sp-4', inclusionType: 'Styling & Production', inclusion: 'Fairy lights dance floor' },
      { id: 'w-deluxe-sp-5', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: Max 40x40 trusses with chandeliers' },
      { id: 'w-deluxe-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceremony Setup: Entrance Arch, 10 pairs aisle flowers, 10 pairs lanterns/signages' },
      { id: 'w-deluxe-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'w-deluxe-sp-8', inclusionType: 'Styling & Production', inclusion: '20 LED Par Lights, 4 Moving Heads' },
      { id: 'w-deluxe-sp-9', inclusionType: 'Styling & Production', inclusion: 'LED Wall: 9x12 high-quality' },
      // Media & Glamour
      { id: 'w-deluxe-mg-1', inclusionType: 'Media & Glamour', inclusion: '2 Photographers, 2 Videographers' },
      { id: 'w-deluxe-mg-2', inclusionType: 'Media & Glamour', inclusion: 'Prenup Pictorial with AVP' },
      { id: 'w-deluxe-mg-3', inclusionType: 'Media & Glamour', inclusion: '2-3 mins Save the Date video' },
      { id: 'w-deluxe-mg-4', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'w-deluxe-mg-5', inclusionType: 'Media & Glamour', inclusion: '20-page Album (Leatherette with Box)' },
      { id: 'w-deluxe-mg-6', inclusionType: 'Media & Glamour', inclusion: '10-page Prenup Album' },
      { id: 'w-deluxe-mg-7', inclusionType: 'Media & Glamour', inclusion: '16x20 Portrait' },
      { id: 'w-deluxe-mg-8', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Bride & Groom (Airbrush) + Prenup make up' },
      { id: 'w-deluxe-mg-9', inclusionType: 'Media & Glamour', inclusion: '50 pcs Elegant Invitations' },
      { id: 'w-deluxe-mg-10', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 30 pcs 4R frame, unlimited standee, free 15 mins stop time' },
      { id: 'w-deluxe-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Mobile Bar: 4 hours free flowing cocktails, 10 pcs local wines' },
      { id: 'w-deluxe-mg-12', inclusionType: 'Media & Glamour', inclusion: 'Bridal Car: 4 hours with chauffeur and Bridal car bouquet' },
      { id: 'w-deluxe-mg-13', inclusionType: 'Media & Glamour', inclusion: 'Entourage Flowers: 1 bridal bouquet, 1 groom buttonier, 3 mini bouquets (mothers/MOH), 3 for female secondary sponsors, 3 flower baskets, 6 corsages for Principal Sponsors, Buttoniers for all male partners' },
      { id: 'w-deluxe-mg-14', inclusionType: 'Media & Glamour', inclusion: '4 Heads Make up (freebie)' },
      { id: 'w-deluxe-mg-15', inclusionType: 'Media & Glamour', inclusion: '6 Set of Photo Gallery' },
      { id: 'w-deluxe-mg-16', inclusionType: 'Media & Glamour', inclusion: 'Aerial / Drone Shot' },
    ],
  },

  {
    id: 'w-grandezza',
    eventType: 'Wedding',
    packageName: 'Grandezza Wedding Package',
    pax: [
      { id: 'w-grandezza-pax-100', pax: 100, paxPrice: 790000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-grandezza-pax-150', pax: 150, paxPrice: 880000, note: 'Additional ₱1,500/head in excess of 100 pax' },
      { id: 'w-grandezza-pax-200', pax: 200, paxPrice: 970000, note: 'Additional ₱1,500/head in excess of 100 pax' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'w-grandezza-pc-1', inclusionType: 'Professional Coordination', inclusion: 'Event coordinators and 1 Event Planner' },
      { id: 'w-grandezza-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Program host' },
      // Catering & Dining
      { id: 'w-grandezza-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Hizons / Rich Gold Catering – Upgraded Menu: 4 meat dishes, 2 pasta, 3 dessert, drink and rice' },
      { id: 'w-grandezza-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Tiffany or Glass Chairs' },
      { id: 'w-grandezza-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Couch for couple' },
      { id: 'w-grandezza-cd-4', inclusionType: 'Catering & Dining', inclusion: 'Welcome Treats: Grazing Table and Sushi Bar' },
      { id: 'w-grandezza-cd-5', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible)' },
      { id: 'w-grandezza-cd-6', inclusionType: 'Catering & Dining', inclusion: '1 Bottle of Wine' },
      { id: 'w-grandezza-cd-7', inclusionType: 'Catering & Dining', inclusion: 'French fries' },
      { id: 'w-grandezza-cd-8', inclusionType: 'Catering & Dining', inclusion: 'Donut Wall' },
      // Styling & Production
      { id: 'w-grandezza-sp-1', inclusionType: 'Styling & Production', inclusion: 'High End Styling: Entrance Tunnel (LED), Elegant Backdrop' },
      { id: 'w-grandezza-sp-2', inclusionType: 'Styling & Production', inclusion: 'Guest/VIP centerpieces with Fresh Flowers' },
      { id: 'w-grandezza-sp-3', inclusionType: 'Styling & Production', inclusion: 'Wave table for 20 pax VIP with Customized styling' },
      { id: 'w-grandezza-sp-4', inclusionType: 'Styling & Production', inclusion: 'Fairy lights dance floor' },
      { id: 'w-grandezza-sp-5', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: Max 40x60 trusses with chandeliers' },
      { id: 'w-grandezza-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceremony Setup: Entrance Arch, 10 pairs aisle flowers, 10 pairs lanterns/signages' },
      { id: 'w-grandezza-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System and Lights' },
      // Media & Glamour
      { id: 'w-grandezza-mg-1', inclusionType: 'Media & Glamour', inclusion: '2 Photographers, 2 Videographers' },
      { id: 'w-grandezza-mg-2', inclusionType: 'Media & Glamour', inclusion: 'Prenup Pictorial with AVP' },
      { id: 'w-grandezza-mg-3', inclusionType: 'Media & Glamour', inclusion: '2-3 mins Save the Date video' },
      { id: 'w-grandezza-mg-4', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'w-grandezza-mg-5', inclusionType: 'Media & Glamour', inclusion: '40-page Album (Leatherette with Box)' },
      { id: 'w-grandezza-mg-6', inclusionType: 'Media & Glamour', inclusion: '10-page Prenup Album' },
      { id: 'w-grandezza-mg-7', inclusionType: 'Media & Glamour', inclusion: '16x20 Portrait' },
      { id: 'w-grandezza-mg-8', inclusionType: 'Media & Glamour', inclusion: '50 pcs Elegant Invitations' },
      { id: 'w-grandezza-mg-9', inclusionType: 'Media & Glamour', inclusion: '4 Heads Make up (freebie)' },
      { id: 'w-grandezza-mg-10', inclusionType: 'Media & Glamour', inclusion: '6 Set of Photo Gallery' },
      { id: 'w-grandezza-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Aerial / Drone Shot' },
    ],
  },

  // ============================================================
  // DEBUT PACKAGES
  // ============================================================
  {
    id: 'd-charming',
    eventType: 'Debut',
    packageName: 'Charming Package',
    pax: [
      { id: 'd-charming-pax-100', pax: 100, paxPrice: 200000, note: 'Additional ₱850/head in excess' },
      { id: 'd-charming-pax-150', pax: 150, paxPrice: 242500, note: 'Additional ₱850/head in excess' },
      { id: 'd-charming-pax-200', pax: 200, paxPrice: 285500, note: 'Additional ₱850/head in excess' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'd-charming-pc-1', inclusionType: 'Professional Coordination', inclusion: '3 Event coordinators' },
      { id: 'd-charming-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Emcee / Program host' },
      // Catering & Dining
      { id: 'd-charming-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet: Steamed Rice, Purified water, 1 Hot Soup, 3 Meat Dishes, 1 Vegetable, 1 Dessert' },
      { id: 'd-charming-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Bottomless Iced Tea' },
      { id: 'd-charming-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Snack Station: Cookies and Chips, Juice Bar' },
      { id: 'd-charming-cd-4', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible, topper not included)' },
      // Styling & Production
      { id: 'd-charming-sp-1', inclusionType: 'Styling & Production', inclusion: 'Red/rustic carpet, Round tables with floor-length cloth, Table runner/topper' },
      { id: 'd-charming-sp-2', inclusionType: 'Styling & Production', inclusion: 'Fabricated flower centerpieces' },
      { id: 'd-charming-sp-3', inclusionType: 'Styling & Production', inclusion: 'Tiffany Chairs for guests' },
      { id: 'd-charming-sp-4', inclusionType: 'Styling & Production', inclusion: 'Elegant Backdrop for debutant with light stand' },
      { id: 'd-charming-sp-5', inclusionType: 'Styling & Production', inclusion: '1 VIP Table' },
      { id: 'd-charming-sp-6', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'd-charming-sp-7', inclusionType: 'Styling & Production', inclusion: '12 LED Par Lights' },
      { id: 'd-charming-sp-8', inclusionType: 'Styling & Production', inclusion: 'Party Poppers' },
      // Media & Glamour
      { id: 'd-charming-mg-1', inclusionType: 'Media & Glamour', inclusion: '1 Photographer, 1 Main Videographer, 1 Creative Videographer' },
      { id: 'd-charming-mg-2', inclusionType: 'Media & Glamour', inclusion: 'Pre-event pictorial' },
      { id: 'd-charming-mg-3', inclusionType: 'Media & Glamour', inclusion: '20 pages 8x10 Magnetic Album (Leatherette with Box)' },
      { id: 'd-charming-mg-4', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'd-charming-mg-5', inclusionType: 'Media & Glamour', inclusion: 'Photobooth: 2 hours with props' },
      { id: 'd-charming-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Celebrant with retouch + Mother (Traditional)' },
      { id: 'd-charming-mg-7', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'd-charming-mg-8', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial' },
      { id: 'd-charming-mg-9', inclusionType: 'Media & Glamour', inclusion: 'AVP slideshow' },
      { id: 'd-charming-mg-10', inclusionType: 'Media & Glamour', inclusion: 'Couch for celebrant' },
      { id: 'd-charming-mg-11', inclusionType: 'Media & Glamour', inclusion: 'LCD Projector and Screen' },
    ],
  },

  {
    id: 'd-irresistible',
    eventType: 'Debut',
    packageName: 'Irresistible Package',
    pax: [
      { id: 'd-irresistible-pax-100', pax: 100, paxPrice: 295000, note: 'Additional ₱950/head in excess' },
      { id: 'd-irresistible-pax-150', pax: 150, paxPrice: 342500, note: 'Additional ₱950/head in excess' },
      { id: 'd-irresistible-pax-200', pax: 200, paxPrice: 390000, note: 'Additional ₱950/head in excess' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'd-irresistible-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators' },
      { id: 'd-irresistible-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Emcee / Program host' },
      // Catering & Dining
      { id: 'd-irresistible-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet: Steamed Rice, Purified water, 1 Hot Soup, 4 Meat Dishes, 1 Vegetable, Pasta, Dessert' },
      { id: 'd-irresistible-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Bottomless Iced Tea' },
      { id: 'd-irresistible-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Snack Station: Cookies and Chips, Juice Bar' },
      { id: 'd-irresistible-cd-4', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible, topper not included)' },
      { id: 'd-irresistible-cd-5', inclusionType: 'Catering & Dining', inclusion: 'French fries station (100 pax)' },
      { id: 'd-irresistible-cd-6', inclusionType: 'Catering & Dining', inclusion: 'Iced coffee bar (100 pax)' },
      // Styling & Production
      { id: 'd-irresistible-sp-1', inclusionType: 'Styling & Production', inclusion: 'Red/rustic carpet, Round tables with floor-length cloth, Table runner/topper' },
      { id: 'd-irresistible-sp-2', inclusionType: 'Styling & Production', inclusion: 'Fabricated flower centerpieces' },
      { id: 'd-irresistible-sp-3', inclusionType: 'Styling & Production', inclusion: 'Tiffany Chairs for guests' },
      { id: 'd-irresistible-sp-4', inclusionType: 'Styling & Production', inclusion: 'LED Wall Backdrop' },
      { id: 'd-irresistible-sp-5', inclusionType: 'Styling & Production', inclusion: 'VIP Treatment for 1 Table' },
      { id: 'd-irresistible-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceiling: Ceiling swags/tassels/wisterias/maple, drop lights, Elegant Entrance Tunnel (trusses not included)' },
      { id: 'd-irresistible-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'd-irresistible-sp-8', inclusionType: 'Styling & Production', inclusion: '15 LED Par Lights, 4 Moving Heads' },
      // Media & Glamour
      { id: 'd-irresistible-mg-1', inclusionType: 'Media & Glamour', inclusion: '1 Main Photographer, 1 Creative Photographer' },
      { id: 'd-irresistible-mg-2', inclusionType: 'Media & Glamour', inclusion: '1 Main Videographer, 1 Creative Videographer' },
      { id: 'd-irresistible-mg-3', inclusionType: 'Media & Glamour', inclusion: 'Pre-event pictorial with Drone shots' },
      { id: 'd-irresistible-mg-4', inclusionType: 'Media & Glamour', inclusion: '20-page Magnetic Album (Leatherette with Box)' },
      { id: 'd-irresistible-mg-5', inclusionType: 'Media & Glamour', inclusion: '10-page Pictorial Album' },
      { id: 'd-irresistible-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'd-irresistible-mg-7', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 3 hours, unlimited standee, free 15 mins stop time' },
      { id: 'd-irresistible-mg-8', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Celebrant with retouch + Mother (Airbrush)' },
      { id: 'd-irresistible-mg-9', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'd-irresistible-mg-10', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial' },
      { id: 'd-irresistible-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Traditional make up for pictorial' },
      { id: 'd-irresistible-mg-12', inclusionType: 'Media & Glamour', inclusion: 'AVP slideshow' },
      { id: 'd-irresistible-mg-13', inclusionType: 'Media & Glamour', inclusion: 'Couch for celebrant' },
      { id: 'd-irresistible-mg-14', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial make up' },
      { id: 'd-irresistible-mg-15', inclusionType: 'Media & Glamour', inclusion: 'Save the Date' },
    ],
  },

  {
    id: 'd-flawless',
    eventType: 'Debut',
    packageName: 'Flawless Package',
    pax: [
      { id: 'd-flawless-pax-100', pax: 100, paxPrice: 395000, note: 'Additional ₱1,000/head in excess' },
      { id: 'd-flawless-pax-150', pax: 150, paxPrice: 445000, note: 'Additional ₱1,000/head in excess' },
      { id: 'd-flawless-pax-200', pax: 200, paxPrice: 495000, note: 'Additional ₱1,000/head in excess' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'd-flawless-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators' },
      { id: 'd-flawless-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Emcee / Program host' },
      // Catering & Dining
      { id: 'd-flawless-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet: Steamed Rice, Purified water, 1 Hot Soup, 4 Meat Dishes, 1 Vegetable, Pasta, 3 Desserts' },
      { id: 'd-flawless-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Bottomless Iced Tea' },
      { id: 'd-flawless-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Snack Station: Grazing Table, Juice Bar' },
      { id: 'd-flawless-cd-4', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible, topper not included)' },
      { id: 'd-flawless-cd-5', inclusionType: 'Catering & Dining', inclusion: 'French fries station (100 pax)' },
      { id: 'd-flawless-cd-6', inclusionType: 'Catering & Dining', inclusion: 'Iced coffee bar (100 pax)' },
      // Styling & Production
      { id: 'd-flawless-sp-1', inclusionType: 'Styling & Production', inclusion: 'Red/rustic carpet, Round tables floor-length cloth, Table runner/topper' },
      { id: 'd-flawless-sp-2', inclusionType: 'Styling & Production', inclusion: 'Fabricated flower centerpieces' },
      { id: 'd-flawless-sp-3', inclusionType: 'Styling & Production', inclusion: 'Ghost Chairs for guests' },
      { id: 'd-flawless-sp-4', inclusionType: 'Styling & Production', inclusion: 'LED Wall Backdrop' },
      { id: 'd-flawless-sp-5', inclusionType: 'Styling & Production', inclusion: 'Chandeliers for Stage' },
      { id: 'd-flawless-sp-6', inclusionType: 'Styling & Production', inclusion: '1 VIP Table' },
      { id: 'd-flawless-sp-7', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: 20x30 trusses, ceiling swags/tassels/wisterias/maple, drop lights and chandeliers, Elegant Entrance Tunnel, Aisle arrangement' },
      { id: 'd-flawless-sp-8', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'd-flawless-sp-9', inclusionType: 'Styling & Production', inclusion: '30 LED Par Lights, 4 Moving Heads, Follow spot' },
      // Media & Glamour
      { id: 'd-flawless-mg-1', inclusionType: 'Media & Glamour', inclusion: '1 Main Photographer, 1 Creative Photographer' },
      { id: 'd-flawless-mg-2', inclusionType: 'Media & Glamour', inclusion: '1 Main Videographer, 1 Creative Videographer' },
      { id: 'd-flawless-mg-3', inclusionType: 'Media & Glamour', inclusion: 'Pre-event pictorial with Drone shots' },
      { id: 'd-flawless-mg-4', inclusionType: 'Media & Glamour', inclusion: '20-page Magnetic Album (Leatherette with Box)' },
      { id: 'd-flawless-mg-5', inclusionType: 'Media & Glamour', inclusion: '10-page Pictorial Album' },
      { id: 'd-flawless-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'd-flawless-mg-7', inclusionType: 'Media & Glamour', inclusion: '16x20 Portrait' },
      { id: 'd-flawless-mg-8', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 4 hours, 30 pcs 4R frame, unlimited standee, free 15 mins stop time' },
      { id: 'd-flawless-mg-9', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Celebrant with retouch (Airbrush), Mother (Traditional)' },
      { id: 'd-flawless-mg-10', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'd-flawless-mg-11', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial' },
      { id: 'd-flawless-mg-12', inclusionType: 'Media & Glamour', inclusion: 'AVP slideshow' },
      { id: 'd-flawless-mg-13', inclusionType: 'Media & Glamour', inclusion: 'Couch for celebrant' },
      { id: 'd-flawless-mg-14', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial make up' },
      { id: 'd-flawless-mg-15', inclusionType: 'Media & Glamour', inclusion: 'Save the Date' },
    ],
  },

  {
    id: 'd-elegancia',
    eventType: 'Debut',
    packageName: 'Elegancia Package',
    pax: [
      { id: 'd-elegancia-pax-100', pax: 100, paxPrice: 495000, note: 'Additional ₱1,200/head in excess' },
      { id: 'd-elegancia-pax-150', pax: 150, paxPrice: 555000, note: 'Additional ₱1,200/head in excess' },
      { id: 'd-elegancia-pax-200', pax: 200, paxPrice: 615000, note: 'Additional ₱1,200/head in excess' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'd-elegancia-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators' },
      { id: 'd-elegancia-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Emcee / Program host' },
      // Catering & Dining
      { id: 'd-elegancia-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet: Steamed Rice, Purified water, 1 Hot Soup, 4 Meat Dishes (1 onsite carving station), Vegetable, Pasta Bar, 3 Desserts' },
      { id: 'd-elegancia-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Bottomless Iced Tea' },
      { id: 'd-elegancia-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Snack Station: Grazing Table, Dimsum Station, Juice Bar' },
      { id: 'd-elegancia-cd-4', inclusionType: 'Catering & Dining', inclusion: '3-layered cake (bottom edible, topper not included)' },
      { id: 'd-elegancia-cd-5', inclusionType: 'Catering & Dining', inclusion: 'Perfume bar (100 pax)' },
      { id: 'd-elegancia-cd-6', inclusionType: 'Catering & Dining', inclusion: 'Iced coffee bar (100 pax)' },
      { id: 'd-elegancia-cd-7', inclusionType: 'Catering & Dining', inclusion: 'French fries station (100 pax)' },
      // Styling & Production
      { id: 'd-elegancia-sp-1', inclusionType: 'Styling & Production', inclusion: 'Red/rustic carpet, Round tables floor-length cloth, Table runner/topper' },
      { id: 'd-elegancia-sp-2', inclusionType: 'Styling & Production', inclusion: 'Fabricated flower centerpieces' },
      { id: 'd-elegancia-sp-3', inclusionType: 'Styling & Production', inclusion: 'Ghost Chairs for guests' },
      { id: 'd-elegancia-sp-4', inclusionType: 'Styling & Production', inclusion: 'LED Wall Backdrop with light stand' },
      { id: 'd-elegancia-sp-5', inclusionType: 'Styling & Production', inclusion: 'VIP Treatment for 1 Table, Candice chairs, Wave table' },
      { id: 'd-elegancia-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: Max 40x60 trusses, ceiling swags/tassels/wisterias/maple, drop lights and chandeliers, Elegant Entrance Tunnel, Aisle arrangement, Fairy lights dance floor' },
      { id: 'd-elegancia-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'd-elegancia-sp-8', inclusionType: 'Styling & Production', inclusion: '30 LED Par Lights, Follow spot, 6 Moving Heads' },
      { id: 'd-elegancia-sp-9', inclusionType: 'Styling & Production', inclusion: 'Special Effects: Laser cone / Snow Effect, Haze Machine' },
      // Media & Glamour
      { id: 'd-elegancia-mg-1', inclusionType: 'Media & Glamour', inclusion: '1 Main Photographer, 1 Creative Photographer' },
      { id: 'd-elegancia-mg-2', inclusionType: 'Media & Glamour', inclusion: '1 Main Videographer, 1 Creative Videographer' },
      { id: 'd-elegancia-mg-3', inclusionType: 'Media & Glamour', inclusion: 'Pre-event pictorial with Drone shots' },
      { id: 'd-elegancia-mg-4', inclusionType: 'Media & Glamour', inclusion: '40-page Magnetic Album (Leatherette with Box)' },
      { id: 'd-elegancia-mg-5', inclusionType: 'Media & Glamour', inclusion: '10-page Pictorial Album' },
      { id: 'd-elegancia-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'd-elegancia-mg-7', inclusionType: 'Media & Glamour', inclusion: '16x20 Portrait' },
      { id: 'd-elegancia-mg-8', inclusionType: 'Media & Glamour', inclusion: '3 pcs Photo for Gallery' },
      { id: 'd-elegancia-mg-9', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 4 hours, 30 pcs 4R frame, unlimited standee, free 15 mins stop time' },
      { id: 'd-elegancia-mg-10', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Celebrant with retouch + Mother (Airbrush)' },
      { id: 'd-elegancia-mg-11', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'd-elegancia-mg-12', inclusionType: 'Media & Glamour', inclusion: 'Mobile Bar: 4 hours free flowing drinks (cocktails, mocktails, 50 pcs beer in can)' },
      { id: 'd-elegancia-mg-13', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial' },
      { id: 'd-elegancia-mg-14', inclusionType: 'Media & Glamour', inclusion: 'AVP slideshow' },
      { id: 'd-elegancia-mg-15', inclusionType: 'Media & Glamour', inclusion: 'Couch for celebrant' },
      { id: 'd-elegancia-mg-16', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial make up' },
      { id: 'd-elegancia-mg-17', inclusionType: 'Media & Glamour', inclusion: 'Save the Date' },
    ],
  },

  {
    id: 'd-grandiosa',
    eventType: 'Debut',
    packageName: 'Grandiosa Package',
    pax: [
      { id: 'd-grandiosa-pax-100', pax: 100, paxPrice: 595000, note: 'Additional ₱1,500/head in excess' },
      { id: 'd-grandiosa-pax-150', pax: 150, paxPrice: 670000, note: 'Additional ₱1,500/head in excess' },
      { id: 'd-grandiosa-pax-200', pax: 200, paxPrice: 745000, note: 'Additional ₱1,500/head in excess' },
    ],
    inclusions: [
      // Professional Coordination
      { id: 'd-grandiosa-pc-1', inclusionType: 'Professional Coordination', inclusion: '4 Event coordinators' },
      { id: 'd-grandiosa-pc-2', inclusionType: 'Professional Coordination', inclusion: '1 Emcee / Program host' },
      // Catering & Dining
      { id: 'd-grandiosa-cd-1', inclusionType: 'Catering & Dining', inclusion: 'Buffet – Upgraded Menu: Steamed Rice, Purified water, 1 Hot Soup, 4 Meat Dishes (1 onsite carving station), Vegetable, Pasta Bar, 3 Desserts' },
      { id: 'd-grandiosa-cd-2', inclusionType: 'Catering & Dining', inclusion: 'Bottomless Iced Tea' },
      { id: 'd-grandiosa-cd-3', inclusionType: 'Catering & Dining', inclusion: 'Snack Station: Grazing Table, Dimsum Station, Pastry Corner, Juice Bar' },
      { id: 'd-grandiosa-cd-4', inclusionType: 'Catering & Dining', inclusion: 'Cake Mapping, 18 pcs mini cakes, 1 10-inch cake for slicing (topper not included)' },
      { id: 'd-grandiosa-cd-5', inclusionType: 'Catering & Dining', inclusion: 'Perfume bar (100 pax)' },
      { id: 'd-grandiosa-cd-6', inclusionType: 'Catering & Dining', inclusion: 'Iced coffee bar (100 pax)' },
      { id: 'd-grandiosa-cd-7', inclusionType: 'Catering & Dining', inclusion: 'French fries station (100 pax)' },
      // Styling & Production
      { id: 'd-grandiosa-sp-1', inclusionType: 'Styling & Production', inclusion: 'Red/rustic carpet, Round tables floor-length cloth, Table runner/topper' },
      { id: 'd-grandiosa-sp-2', inclusionType: 'Styling & Production', inclusion: 'Fresh Flower centerpieces and Fabricated flower centerpieces' },
      { id: 'd-grandiosa-sp-3', inclusionType: 'Styling & Production', inclusion: 'Ghost Chairs for guests' },
      { id: 'd-grandiosa-sp-4', inclusionType: 'Styling & Production', inclusion: 'Panoramic LED Wall with light stand' },
      { id: 'd-grandiosa-sp-5', inclusionType: 'Styling & Production', inclusion: 'VIP Treatment for 1 Table, Candice chairs, Wave table' },
      { id: 'd-grandiosa-sp-6', inclusionType: 'Styling & Production', inclusion: 'Ceiling Treatment: Max 40x60 trusses, ceiling swags/tassels/wisterias/maple, drop lights and chandeliers, Elegant Entrance Tunnel, Aisle arrangement, Fairy lights dance floor (or round stage with tarp logo + full floral arrangement)' },
      { id: 'd-grandiosa-sp-7', inclusionType: 'Styling & Production', inclusion: 'Complete Sound System' },
      { id: 'd-grandiosa-sp-8', inclusionType: 'Styling & Production', inclusion: '30 LED Par Lights, Follow spot, 6 Moving Heads' },
      { id: 'd-grandiosa-sp-9', inclusionType: 'Styling & Production', inclusion: 'Special Effects: Laser cone / Snow Effect, Haze Machine' },
      // Media & Glamour
      { id: 'd-grandiosa-mg-1', inclusionType: 'Media & Glamour', inclusion: '1 Main Photographer, 1 Creative Photographer' },
      { id: 'd-grandiosa-mg-2', inclusionType: 'Media & Glamour', inclusion: '1 Main Videographer, 1 Creative Videographer' },
      { id: 'd-grandiosa-mg-3', inclusionType: 'Media & Glamour', inclusion: 'Pre-event pictorial with Drone shots' },
      { id: 'd-grandiosa-mg-4', inclusionType: 'Media & Glamour', inclusion: '40-page Magnetic Album (Leatherette with Box)' },
      { id: 'd-grandiosa-mg-5', inclusionType: 'Media & Glamour', inclusion: '10-page Pictorial Album' },
      { id: 'd-grandiosa-mg-6', inclusionType: 'Media & Glamour', inclusion: 'Same day edit video' },
      { id: 'd-grandiosa-mg-7', inclusionType: 'Media & Glamour', inclusion: '16x20 Portrait' },
      { id: 'd-grandiosa-mg-8', inclusionType: 'Media & Glamour', inclusion: '3 pcs Photo for Gallery' },
      { id: 'd-grandiosa-mg-9', inclusionType: 'Media & Glamour', inclusion: 'On-Site Photo Studio: 4 hours, 30 pcs 4R frame, unlimited standee, free 15 mins stop time' },
      { id: 'd-grandiosa-mg-10', inclusionType: 'Media & Glamour', inclusion: 'Hair & Make Up: Celebrant with retouch + Mother (Airbrush)' },
      { id: 'd-grandiosa-mg-11', inclusionType: 'Media & Glamour', inclusion: '50 pcs Invitation' },
      { id: 'd-grandiosa-mg-12', inclusionType: 'Media & Glamour', inclusion: 'Mobile Bar: 4 hours free flowing drinks (cocktails, mocktails, 50 pcs beer in can)' },
      { id: 'd-grandiosa-mg-13', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial' },
      { id: 'd-grandiosa-mg-14', inclusionType: 'Media & Glamour', inclusion: 'AVP slideshow' },
      { id: 'd-grandiosa-mg-15', inclusionType: 'Media & Glamour', inclusion: 'Couch for celebrant' },
      { id: 'd-grandiosa-mg-16', inclusionType: 'Media & Glamour', inclusion: 'Pre-debut pictorial make up' },
      { id: 'd-grandiosa-mg-17', inclusionType: 'Media & Glamour', inclusion: 'Save the Date' },
    ],
  },
];

// ---- Insert helpers ----

async function put(item, label) {
  try {
    await client.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      })
    );
    console.log(`  ✓ ${label}`);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      console.log(`  – ${label} (already exists, skipped)`);
    } else {
      throw err;
    }
  }
}

// ---- Seed ----

let totalInserted = 0;

for (const pkg of PACKAGES) {
  console.log(`\nSeeding: ${pkg.packageName}`);

  // METADATA
  await put(
    {
      PK: { S: `PACKAGE#${pkg.id}` },
      SK: { S: 'METADATA' },
      eventType: { S: pkg.eventType },
      packageName: { S: pkg.packageName },
      images: { S: '[]' },
      created_at: { S: NOW },
      updated_at: { S: NOW },
    },
    `METADATA – ${pkg.packageName}`
  );
  totalInserted++;

  // PAX
  for (const p of pkg.pax) {
    const item = {
      PK: { S: `PACKAGE#${pkg.id}` },
      SK: { S: `PAX#${p.id}` },
      pax: { N: String(p.pax) },
      paxPrice: { N: String(p.paxPrice) },
      created_at: { S: NOW },
      updated_at: { S: NOW },
    };
    if (p.note) item.note = { S: p.note };
    await put(item, `PAX – ${p.pax} pax @ ₱${p.paxPrice.toLocaleString()}`);
    totalInserted++;
  }

  // INCLUSIONS
  for (const inc of pkg.inclusions) {
    await put(
      {
        PK: { S: `PACKAGE#${pkg.id}` },
        SK: { S: `INCLUSION#${inc.id}` },
        inclusionType: { S: inc.inclusionType },
        inclusion: { S: inc.inclusion },
        created_at: { S: NOW },
        updated_at: { S: NOW },
      },
      `[${inc.inclusionType}] ${inc.inclusion.slice(0, 60)}${inc.inclusion.length > 60 ? '…' : ''}`
    );
    totalInserted++;
  }
}

console.log(`\nDone. ${totalInserted} records processed across ${PACKAGES.length} packages.`);
