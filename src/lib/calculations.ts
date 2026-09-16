import { OrderItem, LineItemCalculation, OrderTotalsCalculation, SpecialDiscountConfig } from '../types/order';

export const CalculationsEngine = {
  /**
   * Calculate exact line item tax breakdown
   */
  calculateLineItem(item: Partial<OrderItem>): LineItemCalculation {
    const rate = parseFloat(String(item.rate || 0)) || 0;
    const quantity = parseFloat(String(item.quantity || 0)) || 0;
    const discountPercent = parseFloat(String(item.discount_percent || 0)) || 0;
    const gstPercent = parseFloat(String(item.gst_percent || 0)) || 0;

    const grossAmount = rate * quantity;
    const discountAmount = grossAmount * (discountPercent / 100);
    const taxableAmount = Math.max(0, grossAmount - discountAmount);
    const gstAmount = taxableAmount * (gstPercent / 100);
    const totalAmount = taxableAmount + gstAmount;

    return {
      gross_amount: Number(grossAmount.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      taxable_amount: Number(taxableAmount.toFixed(2)),
      gst_amount: Number(gstAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
    };
  },

  /**
   * Calculate aggregated totals for an order with optional special one-time order discount
   */
  calculateOrderTotals(
    items: Partial<OrderItem>[],
    specialDiscount?: SpecialDiscountConfig | null
  ): OrderTotalsCalculation {
    let grossSubtotal = 0;
    let itemsDiscountAmount = 0;
    let baseTaxableAmount = 0;
    let baseGstAmount = 0;

    items.forEach((item) => {
      const calc = this.calculateLineItem(item);
      grossSubtotal += calc.gross_amount;
      itemsDiscountAmount += calc.discount_amount;
      baseTaxableAmount += calc.taxable_amount;
      baseGstAmount += calc.gst_amount;
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
    // Adjust GST proportionately to net taxable amount
    const gstRatio = baseTaxableAmount > 0 ? netTaxableAmount / baseTaxableAmount : 1;
    const adjustedGstAmount = baseGstAmount * gstRatio;
    const totalAmount = netTaxableAmount + adjustedGstAmount;
    const totalDiscountAmount = itemsDiscountAmount + specialDiscountAmount;

    return {
      gross_subtotal: Number(grossSubtotal.toFixed(2)),
      items_discount_amount: Number(itemsDiscountAmount.toFixed(2)),
      special_discount_amount: Number(specialDiscountAmount.toFixed(2)),
      special_discount_percent: Number(specialDiscountPercent.toFixed(2)),
      discount_amount: Number(totalDiscountAmount.toFixed(2)),
      taxable_amount: Number(netTaxableAmount.toFixed(2)),
      gst_amount: Number(adjustedGstAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
      subtotal: Number(grossSubtotal.toFixed(2)),
    };
  },
};
