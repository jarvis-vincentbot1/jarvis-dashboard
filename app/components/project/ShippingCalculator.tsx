import { useState, useMemo } from "react";
import { DollarSign, Truck, Weight, Globe, Package } from "lucide-react";

// ─── Types & Constants
type CarrierType = "DHL" | "UPS" | "GLS" | "FedEx";
type CountryCode = "DE" | "UK" | "FR" | "NL" | "USA" | "HK" | "CN" | "JP" | "SG" | "AU";

const CARRIERS: Record<CarrierType, { label: string; color: string }> = {
  DHL: { label: "DHL", color: "bg-yellow-500/15 text-yellow-700" },
  UPS: { label: "UPS", color: "bg-amber-500/15 text-amber-700" },
  GLS: { label: "GLS", color: "bg-orange-500/15 text-orange-700" },
  FedEx: { label: "FedEx", color: "bg-purple-500/15 text-purple-700" },
};

// Country data with names
const COUNTRY_DATA: Record<CountryCode, { name: string; region: string }> = {
  DE: { name: "Germany", region: "EU" },
  UK: { name: "United Kingdom", region: "EU" },
  FR: { name: "France", region: "EU" },
  NL: { name: "Netherlands", region: "EU" },
  USA: { name: "United States", region: "International" },
  HK: { name: "Hong Kong", region: "Asia" },
  CN: { name: "China", region: "Asia" },
  JP: { name: "Japan", region: "Asia" },
  SG: { name: "Singapore", region: "Asia" },
  AU: { name: "Australia", region: "International" },
};

// Country-specific shipping rates (base + per kg) in EUR
const SHIPPING_RATES: Record<CountryCode, Record<CarrierType, { base: number; perKg: number }>> = {
  // EU Destinations
  DE: {
    DHL: { base: 5, perKg: 0.5 },
    UPS: { base: 6, perKg: 0.6 },
    GLS: { base: 3, perKg: 0.4 },
    FedEx: { base: 8, perKg: 0.7 },
  },
  UK: {
    DHL: { base: 8, perKg: 0.7 },
    UPS: { base: 9, perKg: 0.75 },
    GLS: { base: 6, perKg: 0.55 },
    FedEx: { base: 12, perKg: 0.85 },
  },
  FR: {
    DHL: { base: 6, perKg: 0.55 },
    UPS: { base: 7, perKg: 0.65 },
    GLS: { base: 4, perKg: 0.45 },
    FedEx: { base: 10, perKg: 0.75 },
  },
  NL: {
    DHL: { base: 4, perKg: 0.45 },
    UPS: { base: 5, perKg: 0.55 },
    GLS: { base: 2.5, perKg: 0.35 },
    FedEx: { base: 7, perKg: 0.65 },
  },
  // International - USA
  USA: {
    DHL: { base: 18, perKg: 1.5 },
    UPS: { base: 20, perKg: 1.6 },
    GLS: { base: 16, perKg: 1.3 },
    FedEx: { base: 22, perKg: 1.75 },
  },
  // Asia - Hong Kong
  HK: {
    DHL: { base: 15, perKg: 2.0 },
    UPS: { base: 17, perKg: 2.2 },
    GLS: { base: 13, perKg: 1.8 },
    FedEx: { base: 18, perKg: 2.5 },
  },
  // Asia - China
  CN: {
    DHL: { base: 12, perKg: 1.8 },
    UPS: { base: 14, perKg: 2.0 },
    GLS: { base: 10, perKg: 1.5 },
    FedEx: { base: 16, perKg: 2.3 },
  },
  // Asia - Japan
  JP: {
    DHL: { base: 18, perKg: 2.2 },
    UPS: { base: 20, perKg: 2.4 },
    GLS: { base: 16, perKg: 2.0 },
    FedEx: { base: 22, perKg: 2.6 },
  },
  // Asia - Singapore
  SG: {
    DHL: { base: 14, perKg: 1.9 },
    UPS: { base: 16, perKg: 2.1 },
    GLS: { base: 12, perKg: 1.7 },
    FedEx: { base: 17, perKg: 2.4 },
  },
  // International - Australia
  AU: {
    DHL: { base: 22, perKg: 2.5 },
    UPS: { base: 25, perKg: 2.8 },
    GLS: { base: 20, perKg: 2.2 },
    FedEx: { base: 28, perKg: 3.0 },
  },
};

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);

// ─── ShippingCalculator Component
const ShippingCalculator = () => {
  const [productCost, setProductCost] = useState(25);
  const [sellingPrice, setSellingPrice] = useState(79.99);
  const [weight, setWeight] = useState(0.5);
  const [carrier, setCarrier] = useState<CarrierType>("DHL");
  const [country, setCountry] = useState<CountryCode>("DE");
  const [useCustomShipping, setUseCustomShipping] = useState(false);
  const [customShippingCost, setCustomShippingCost] = useState(0);

  // Calculate shipping cost (use country-specific rates)
  const countryRates = SHIPPING_RATES[country];
  const carrierRates = countryRates[carrier];
  const calculatedShippingCost = carrierRates.base + weight * carrierRates.perKg;
  const shippingCost = useCustomShipping ? customShippingCost : calculatedShippingCost;

  // Calculate totals
  const totalCost = productCost + shippingCost;
  const profit = sellingPrice - totalCost;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const breakEvenPrice = totalCost;

  // Determine profit/loss status
  const isProfitable = profit >= 0;
  const statusColor = isProfitable ? "text-primary" : "text-destructive";
  const statusBgColor = isProfitable ? "bg-primary/10" : "bg-destructive/10";

  // All carriers comparison with country-specific rates
  const carriersComparison = useMemo(() => {
    const countryRates = SHIPPING_RATES[country];
    return (Object.keys(CARRIERS) as CarrierType[]).map((carrierKey) => {
      const rates = countryRates[carrierKey];
      const cost = rates.base + weight * rates.perKg;
      const total = productCost + cost;
      const p = sellingPrice - total;
      const margin = sellingPrice > 0 ? (p / sellingPrice) * 100 : 0;
      return { carrier: carrierKey, cost, total, profit: p, margin, base: rates.base, perKg: rates.perKg };
    });
  }, [weight, productCost, sellingPrice, country]);

  return (
    <div className="space-y-6">
      {/* Inputs Section */}
      <div className="gc-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Package className="w-4 h-4 text-primary" /> Product Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Cost */}
          <div>
            <label className="gc-section-label">Product Cost (€)</label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="number"
                value={productCost}
                onChange={(e) => setProductCost(Math.max(0, Number(e.target.value)))}
                className="gc-input pl-6"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Selling Price */}
          <div>
            <label className="gc-section-label">Selling Price (€)</label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                className="gc-input pl-6"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="gc-section-label">Weight (kg)</label>
            <div className="relative mt-1">
              <Weight className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
                className="gc-input pl-6"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="gc-section-label">Destination Country</label>
            <div className="relative mt-1">
              <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className="gc-input pl-6 appearance-none cursor-pointer"
              >
                <optgroup label="Europe">
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="UK">🇬🇧 United Kingdom</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="NL">🇳🇱 Netherlands</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="USA">🇺🇸 United States</option>
                </optgroup>
                <optgroup label="Asia-Pacific">
                  <option value="HK">🇭🇰 Hong Kong</option>
                  <option value="CN">🇨🇳 China</option>
                  <option value="JP">🇯🇵 Japan</option>
                  <option value="SG">🇸🇬 Singapore</option>
                  <option value="AU">🇦🇺 Australia</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Carrier Selection */}
          <div className="sm:col-span-2">
            <label className="gc-section-label">Shipping Carrier</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {(Object.keys(CARRIERS) as CarrierType[]).map((key) => {
                const rates = SHIPPING_RATES[country][key];
                const data = CARRIERS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setCarrier(key)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      carrier === key
                        ? `${data.color} ring-2 ring-offset-1 ring-current`
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Truck className="w-3 h-3 mx-auto mb-0.5" />
                    {data.label}
                    <div className="text-[10px] opacity-75 mt-0.5">€{rates.base} + €{rates.perKg.toFixed(2)}/kg</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Shipping Cost */}
          <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="customShipping"
                checked={useCustomShipping}
                onChange={(e) => setUseCustomShipping(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="customShipping" className="gc-section-label cursor-pointer mb-0">
                Use Custom Shipping Cost
              </label>
            </div>
            {useCustomShipping && (
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="number"
                  value={customShippingCost}
                  onChange={(e) => setCustomShippingCost(Math.max(0, Number(e.target.value)))}
                  className="gc-input pl-6"
                  min="0"
                  step="0.01"
                  placeholder="Enter your actual shipping cost"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="gc-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-primary" /> Cost Breakdown
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground">
            <span>Product Cost</span>
            <span className="font-medium">{fmt(productCost)}</span>
          </div>

          <div className={`flex flex-col gap-1 px-3 py-1.5 rounded text-sm text-foreground`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {carrier} Shipping to {COUNTRY_DATA[country].name}
              </span>
              <span className="font-medium">{fmt(shippingCost)}</span>
            </div>
            {!useCustomShipping && (
              <div className="text-xs text-muted-foreground flex justify-end">
                €{carrierRates.base.toFixed(2)} + €{carrierRates.perKg.toFixed(2)}/kg
              </div>
            )}
            {useCustomShipping && (
              <div className="text-xs text-primary/70 flex justify-end">
                (Custom rate)
              </div>
            )}
          </div>

          <div className="border-t border-border my-2" />

          <div className={`flex items-center justify-between px-3 py-2 rounded font-semibold text-sm ${statusBgColor} ${statusColor}`}>
            <span>Total Cost</span>
            <span>{fmt(totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Profit Analysis */}
      <div className={`gc-card p-4 space-y-3 ${statusBgColor}`}>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-primary" /> Profit Analysis
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground">
            <span>Selling Price</span>
            <span className="font-medium">{fmt(sellingPrice)}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground">
            <span>Total Cost</span>
            <span className="font-medium">−{fmt(totalCost)}</span>
          </div>

          <div className="border-t border-current/20 my-2" />

          <div className={`flex items-center justify-between px-3 py-2 rounded font-bold text-base ${statusColor}`}>
            <span>Profit/Loss</span>
            <span>{isProfitable ? "+" : "−"}{fmt(Math.abs(profit))}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground">
            <span>Profit Margin</span>
            <span className={`font-semibold ${statusColor}`}>{profitMargin.toFixed(1)}%</span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-foreground">
            <span>Break-Even Price</span>
            <span className="font-medium">{fmt(breakEvenPrice)}</span>
          </div>
        </div>

        {!isProfitable && (
          <div className="mt-3 p-2 rounded bg-destructive/20 border border-destructive/30">
            <p className="text-xs text-destructive font-medium">
              ⚠️ Loss: You're selling below cost. Raise the price or reduce shipping costs.
            </p>
          </div>
        )}
      </div>

      {/* Carriers Comparison */}
      <div className="gc-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-primary" /> All Carriers Comparison for {COUNTRY_DATA[country].name}
        </h3>

        <div className="space-y-2">
          {carriersComparison.map((item) => {
            const isSelected = item.carrier === carrier;
            const compProfitable = item.profit >= 0;
            const compBg = isSelected ? "bg-primary/10" : "bg-muted/30";
            const compBorder = isSelected ? "border border-primary" : "border border-transparent";

            return (
              <div key={item.carrier} className={`px-3 py-2.5 rounded text-xs ${compBg} ${compBorder}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    {item.carrier}
                    {isSelected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/30 text-primary">Selected</span>}
                  </span>
                  <span className={`font-bold ${compProfitable ? "text-primary" : "text-destructive"}`}>
                    {compProfitable ? "+" : "−"}{fmt(Math.abs(item.profit))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground mb-1">
                  <div>Rate: €{item.base.toFixed(2)} + €{item.perKg.toFixed(2)}/kg</div>
                  <div>Shipping: {fmt(item.cost)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>Total: {fmt(item.total)}</div>
                  <div>Margin: {item.margin.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          className="h-8 text-xs px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
          onClick={() => {
            setProductCost(25);
            setSellingPrice(79.99);
            setWeight(0.5);
            setCarrier("DHL");
            setCountry("DE");
            setUseCustomShipping(false);
            setCustomShippingCost(0);
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default ShippingCalculator;
