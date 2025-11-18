export interface PackingListResponse {
  warningsAndTips: string[];
  outfitSuggestions: OutfitSuggestion[];
  packingList: PackingList;
  shoppingList: string[];
}

export interface OutfitSuggestion {
  activity: string;
  forPassenger: string;
  suggestion: string;
  itemsUsed: string[];
}

export interface PackingList {
  ZaMuskarce: PassengerPackingList;
  ZaZene: PassengerPackingList;
  ZaDjecu?: PassengerPackingList;
  ZajednickeStvari: string[];
}

export interface PassengerPackingList {
  Clothing: string[];
  Footwear: string[];
  Underwear: string[];
}
