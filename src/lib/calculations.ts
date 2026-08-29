import { OrderItem, LineItemCalculation, OrderTotalsCalculation } from '../types/order';

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
   * Calculate aggregated totals for an order
   */
  calculateOrderTotals(items: Partial<OrderItem>[]): OrderTotalsCalculation {
    let grossSubtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let gstAmount = 0;
    let totalAmount = 0;

    items.forEach((item) => {
      const calc = this.calculateLineItem(item);
      grossSubtotal += calc.gross_amount;
      discountAmount += calc.discount_amount;
      taxableAmount += calc.taxable_amount;
      gstAmount += calc.gst_amount;
      totalAmount += calc.total_amount;
    });

    return {
      gross_subtotal: Number(grossSubtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      taxable_amount: Number(taxableAmount.toFixed(2)),
      gst_amount: Number(gstAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
      subtotal: Number(grossSubtotal.toFixed(2)),
    };
  },
};
