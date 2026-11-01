import { OrderItem, LineItemCalculation, OrderTotalsCalculation, SpecialDiscountConfig, GstTaxBreakdownItem } from '../types/order';

export const CalculationsEngine = {
  /**
   * Calculate exact line item tax breakdown with CGST and SGST
   */
  calculateLineItem(item: Partial<OrderItem>): LineItemCalculation {
    const rate = parseFloat(String(item.rate || 0)) || 0;
    const quantity = parseFloat(String(item.quantity || 0)) || 0;
    const discountPercent = parseFloat(String(item.discount_percent || 0)) || 0;
    const gstPercent = parseFloat(String(item.gst_percent !== undefined ? item.gst_percent : 12)) || 0;

    const grossAmount = rate * quantity;
    const discountAmount = grossAmount * (discountPercent / 100);
    const taxableAmount = Math.max(0, grossAmount - discountAmount);

    // Intra-state GST is split 50/50 into CGST and SGST
    const cgstPercent = gstPercent / 2;
    const sgstPercent = gstPercent / 2;
    const cgstAmount = taxableAmount * (cgstPercent / 100);
    const sgstAmount = taxableAmount * (sgstPercent / 100);
    const gstAmount = cgstAmount + sgstAmount;
    const totalAmount = taxableAmount + gstAmount;

    return {
      gross_amount: Number(grossAmount.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      taxable_amount: Number(taxableAmount.toFixed(2)),
      cgst_percent: Number(cgstPercent.toFixed(2)),
      cgst_amount: Number(cgstAmount.toFixed(2)),
      sgst_percent: Number(sgstPercent.toFixed(2)),
      sgst_amount: Number(sgstAmount.toFixed(2)),
      gst_percent: Number(gstPercent.toFixed(2)),
      gst_amount: Number(gstAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
    };
  },

  /**
   * Calculate aggregated totals for an order with CGST, SGST, Round-off, and GST slab breakdown
   */
  calculateOrderTotals(
    items: Partial<OrderItem>[],
    specialDiscount?: SpecialDiscountConfig | null
  ): OrderTotalsCalculation {
    let grossSubtotal = 0;
    let itemsDiscountAmount = 0;
    let baseTaxableAmount = 0;
    let totalQuantity = 0;
    let validItemCount = 0;

    // Group taxable amounts by GST rate slab
    const slabTaxableMap = new Map<number, number>();

    items.forEach((item) => {
      const qty = parseFloat(String(item.quantity || 0)) || 0;
      if (qty <= 0) return;

      validItemCount += 1;
      totalQuantity += qty;

      const calc = this.calculateLineItem(item);
      grossSubtotal += calc.gross_amount;
      itemsDiscountAmount += calc.discount_amount;
      baseTaxableAmount += calc.taxable_amount;

      const gstRate = calc.gst_percent;
      const currentSlabTaxable = slabTaxableMap.get(gstRate) || 0;
      slabTaxableMap.set(gstRate, currentSlabTaxable + calc.taxable_amount);
    });

    let specialDiscountAmount = 0;
    let specialDiscountPercent = 0;

    if (specialDiscount && specialDiscount.value > 0) {
      if (specialDiscount.type === 'percent') {
        specialDiscountPercent = Math.min(100, Math.max(0, specialDiscount.value));
        specialDiscountAmount = baseTaxableAmount * (specialDiscountPercent / 100);
      } else {
        specialDiscountAmount = Math.min(baseTaxableAmount, Math.max(0, specialDiscount.value));
        specialDiscountPercent = baseTaxableAmount > 0
          ? Number(((specialDiscountAmount / baseTaxableAmount) * 100).toFixed(2))
          : 0;
      }
    }

    const netTaxableAmount = Math.max(0, baseTaxableAmount - specialDiscountAmount);
    // Ratio to proportionately adjust tax slabs when order-level discount is applied
    const discountRatio = baseTaxableAmount > 0 ? netTaxableAmount / baseTaxableAmount : 1;

    // Build tax breakdown by GST percentage slab (e.g. GST 18%, GST 12%, GST 5%)
    const taxBreakdown: GstTaxBreakdownItem[] = [];
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;

    // Sort slabs descending (e.g. 18%, 12%, 5%)
    const sortedGstRates = Array.from(slabTaxableMap.keys()).sort((a, b) => b - a);

    sortedGstRates.forEach((gstRate) => {
      const rawSlabTaxable = slabTaxableMap.get(gstRate) || 0;
      const adjustedSlabTaxable = Number((rawSlabTaxable * discountRatio).toFixed(2));

      const cgstPercent = gstRate / 2;
      const sgstPercent = gstRate / 2;
      const cgstAmount = Number((adjustedSlabTaxable * (cgstPercent / 100)).toFixed(2));
      const sgstAmount = Number((adjustedSlabTaxable * (sgstPercent / 100)).toFixed(2));
      const netAmount = Number((adjustedSlabTaxable + cgstAmount + sgstAmount).toFixed(2));

      totalCgstAmount += cgstAmount;
      totalSgstAmount += sgstAmount;

      taxBreakdown.push({
        tax_type: `GST ${gstRate}%`,
        gst_percent: gstRate,
        taxable_amount: adjustedSlabTaxable,
        cgst_percent: Number(cgstPercent.toFixed(2)),
        cgst_amount: cgstAmount,
        sgst_percent: Number(sgstPercent.toFixed(2)),
        sgst_amount: sgstAmount,
        igst_amount: 0,
        net_amount: netAmount,
      });
    });

    const totalGstAmount = Number((totalCgstAmount + totalSgstAmount).toFixed(2));
    const unroundedTotal = netTaxableAmount + totalGstAmount;
    // Exact standard invoice round off to nearest rupee as shown in PDF invoice (e.g. 465.60 -> 466.00, ROff: 0.40)
    const roundedTotal = Math.round(unroundedTotal);
    const roundOff = Number((roundedTotal - unroundedTotal).toFixed(2));
    const totalDiscountAmount = itemsDiscountAmount + specialDiscountAmount;

    return {
      gross_subtotal: Number(grossSubtotal.toFixed(2)),
      items_discount_amount: Number(itemsDiscountAmount.toFixed(2)),
      special_discount_amount: Number(specialDiscountAmount.toFixed(2)),
      special_discount_percent: Number(specialDiscountPercent.toFixed(2)),
      discount_amount: Number(totalDiscountAmount.toFixed(2)),
      taxable_amount: Number(netTaxableAmount.toFixed(2)),
      cgst_amount: Number(totalCgstAmount.toFixed(2)),
      sgst_amount: Number(totalSgstAmount.toFixed(2)),
      gst_amount: totalGstAmount,
      round_off: roundOff,
      total_amount: roundedTotal,
      subtotal: Number(grossSubtotal.toFixed(2)),
      total_quantity: totalQuantity,
      total_items: validItemCount,
      tax_breakdown: taxBreakdown,
    };
  },
};

