export interface SampleProduct {
  id: string;
  sku: string;
  name: string;
  family: string;
  category: string;
  list_price_usd: number;
  stock_qty: number;
  description: string;
}

export const sampleProducts: SampleProduct[] = [
  { id: '1', sku: 'TF-CF-001', name: 'Carbon Filter Cartridge 10in', family: 'Filter Cartridges', category: 'Carbon', list_price_usd: 24.99, stock_qty: 142, description: 'Activated carbon block cartridge. Reduces chlorine, taste and odour. 10 inch standard size.' },
  { id: '2', sku: 'TF-CF-002', name: 'Carbon Filter Cartridge 20in', family: 'Filter Cartridges', category: 'Carbon', list_price_usd: 38.50, stock_qty: 87, description: 'Activated carbon block cartridge. 20 inch jumbo size for high-flow applications.' },
  { id: '3', sku: 'TF-SF-001', name: 'Sediment Filter 5 Micron 10in', family: 'Filter Cartridges', category: 'Sediment', list_price_usd: 12.99, stock_qty: 310, description: 'Polypropylene spun sediment filter. Removes dirt, rust and particles down to 5 micron.' },
  { id: '4', sku: 'TF-SF-002', name: 'Sediment Filter 1 Micron 10in', family: 'Filter Cartridges', category: 'Sediment', list_price_usd: 14.99, stock_qty: 0, description: 'Fine sediment filtration to 1 micron. Ideal as pre-filter for RO systems.' },
  { id: '5', sku: 'TF-RO-001', name: 'RO Membrane 75 GPD', family: 'Membranes', category: 'Reverse Osmosis', list_price_usd: 89.00, stock_qty: 34, description: 'Thin film composite RO membrane. 75 gallons per day. Compatible with standard housings.' },
  { id: '6', sku: 'TF-RO-002', name: 'RO Membrane 100 GPD', family: 'Membranes', category: 'Reverse Osmosis', list_price_usd: 112.00, stock_qty: 21, description: 'High-output TFC reverse osmosis membrane. 100 gallons per day capacity.' },
  { id: '7', sku: 'TF-UF-001', name: 'Ultrafiltration Membrane 0.01 Micron', family: 'Membranes', category: 'Ultrafiltration', list_price_usd: 145.00, stock_qty: 12, description: 'Hollow fibre UF membrane module. Removes bacteria, cysts and colloids.' },
  { id: '8', sku: 'TF-HO-001', name: 'Filter Housing 10in Single', family: 'Housings & Systems', category: 'Filter Housings', list_price_usd: 34.99, stock_qty: 56, description: 'Standard 10 inch single filter housing. 1/4 inch NPT ports. Food-grade polypropylene.' },
  { id: '9', sku: 'TF-HO-002', name: 'Filter Housing 20in Big Blue', family: 'Housings & Systems', category: 'Filter Housings', list_price_usd: 68.00, stock_qty: 29, description: 'Large capacity Big Blue housing. 4.5 x 20 inch. 1 inch NPT ports.' },
  { id: '10', sku: 'TF-SY-001', name: 'Under Sink RO System 5-Stage', family: 'Housings & Systems', category: 'Complete Systems', list_price_usd: 320.00, stock_qty: 8, description: 'Complete 5-stage reverse osmosis system. Includes all filters, membrane, storage tank and faucet.' },
  { id: '11', sku: 'TF-UV-001', name: 'UV Steriliser 6W', family: 'UV & Sterilisation', category: 'UV Sterilisers', list_price_usd: 78.00, stock_qty: 19, description: 'Ultraviolet steriliser for point-of-use applications. 6 watt lamp, 0.5 GPM flow rate.' },
  { id: '12', sku: 'TF-UV-002', name: 'UV Steriliser 25W', family: 'UV & Sterilisation', category: 'UV Sterilisers', list_price_usd: 189.00, stock_qty: 7, description: 'High-output UV system. 25 watt lamp, 8 GPM. Suitable for whole-house or light commercial use.' },
  { id: '13', sku: 'TF-AC-001', name: 'Replacement UV Lamp 6W', family: 'UV & Sterilisation', category: 'Replacement Parts', list_price_usd: 28.00, stock_qty: 44, description: 'Replacement UV lamp for TF-UV-001. Replace annually for optimal performance.' },
  { id: '14', sku: 'TF-ME-001', name: 'TDS Meter Digital', family: 'Testing & Monitoring', category: 'Water Testing', list_price_usd: 18.99, stock_qty: 93, description: 'Handheld digital TDS meter. Measures total dissolved solids in ppm. Includes protective case.' },
  { id: '15', sku: 'TF-ME-002', name: 'Water Quality Test Kit — 16 Parameter', family: 'Testing & Monitoring', category: 'Water Testing', list_price_usd: 42.00, stock_qty: 31, description: 'Comprehensive water quality test kit. Tests pH, hardness, chlorine, nitrates and 12 more parameters.' },
];

export function getPartnerPrice(listPrice: number) {
  return listPrice * 0.75;
}

export function getSaving(listPrice: number) {
  return listPrice * 0.25;
}

export function getStockStatus(qty: number) {
  if (qty === 0) return { label: 'Out of stock', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
  if (qty <= 10) return { label: 'Low stock', color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' };
  return { label: 'In stock', color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500' };
}

export function getFamilies() {
  const map = new Map<string, Set<string>>();
  sampleProducts.forEach(p => {
    if (!map.has(p.family)) map.set(p.family, new Set());
    map.get(p.family)!.add(p.category);
  });
  return map;
}

export function formatUSD(n: number) {
  return '$' + n.toFixed(2);
}
