import { OrderRepository } from '@/repositories/OrderRepository';
import { HoldingRepository } from '@/repositories/HoldingRepository';
import { PositionRepository } from '@/repositories/PositionRepository';
import type { Order, Holding, Position, CreateOrderRequest } from '@/types';
import { ValidationError, NotFoundError } from '@/types';

export class PaperTradingService {
  private orderRepository: OrderRepository;
  private holdingRepository: HoldingRepository;
  private positionRepository: PositionRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.holdingRepository = new HoldingRepository();
    this.positionRepository = new PositionRepository();
  }

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    this.validateOrderData(orderData);

    const order = await this.orderRepository.createOrder(orderData);

    // For paper trading, immediately fill the order at the specified price
    await this.fillOrder(order.id, orderData.quantity, orderData.price);

    return (await this.orderRepository.getOrderById(order.id)) as Order;
  }

  async fillOrder(orderId: string, filledQuantity?: number, filledPrice?: number): Promise<Order> {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new ValidationError('Order is not in pending status');
    }

    const finalFilledQuantity = filledQuantity || order.quantity;
    const finalFilledPrice = filledPrice || order.price;

    // Update order status
    const updatedOrder = await this.orderRepository.updateOrderStatus(
      orderId,
      'FILLED',
      finalFilledQuantity,
      finalFilledPrice
    );

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    // Update holdings
    await this.updateHoldingFromOrder(updatedOrder);

    // Create position
    await this.createPositionFromOrder(updatedOrder);

    return updatedOrder;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new ValidationError('Only pending orders can be cancelled');
    }

    const updatedOrder = await this.orderRepository.updateOrderStatus(orderId, 'CANCELLED');
    if (!updatedOrder) {
      throw new Error('Failed to cancel order');
    }

    return updatedOrder;
  }

  async getOrders(
    instrument?: string,
    status?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ orders: Order[]; total: number }> {
    const orders = await this.orderRepository.getOrders(instrument, status, limit, offset);
    const total = await this.orderRepository.getOrdersCount(instrument, status);

    return { orders, total };
  }

  async getHoldings(): Promise<Holding[]> {
    return await this.holdingRepository.getAllHoldings();
  }

  async getHolding(instrument: string): Promise<Holding | null> {
    return await this.holdingRepository.getHolding(instrument);
  }

  async getPositions(
    instrument?: string,
    status?: 'OPEN' | 'CLOSED',
    limit: number = 100,
    offset: number = 0
  ): Promise<{ positions: Position[]; total: number }> {
    const positions = await this.positionRepository.getPositions(instrument, status, undefined, limit, offset);
    const total = await this.positionRepository.getPositionsCount(instrument, status);

    return { positions, total };
  }

  async closePosition(positionId: string, exitPrice: number): Promise<Position> {
    const position = await this.positionRepository.closePosition(positionId, exitPrice, new Date());

    if (!position) {
      throw new NotFoundError('Position not found or already closed');
    }

    // Update holdings to reflect the position closure
    await this.updateHoldingFromPositionClosure(position);

    return position;
  }

  async getPnLReport(instrument?: string): Promise<{
    totalPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    positions: Position[];
  }> {
    const positionsQuery = await this.positionRepository.getPositions(instrument, 'CLOSED');
    const totalTrades = positionsQuery.length;
    const winningTrades = positionsQuery.filter((p) => p.pnl > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    const realizedPnL = await this.positionRepository.getTotalPnl(instrument);

    // Calculate unrealized PnL from open positions
    const openPositions = await this.positionRepository.getPositions(instrument, 'OPEN');
    const unrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);

    const totalPnL = realizedPnL + unrealizedPnL;

    return {
      totalPnL,
      realizedPnL,
      unrealizedPnL,
      totalTrades,
      winningTrades,
      winRate,
      positions: [...positionsQuery, ...openPositions],
    };
  }

  async updatePositionPrices(instrument: string, currentPrice: number): Promise<void> {
    const openPositions = await this.positionRepository.getOpenPositions(instrument);

    for (const position of openPositions) {
      await this.positionRepository.updatePositionPnl(position.id, currentPrice);
    }

    // Update holdings unrealized PnL
    await this.holdingRepository.updateUnrealizedPnl(instrument, currentPrice);
  }

  private async updateHoldingFromOrder(order: Order): Promise<void> {
    const existingHolding = await this.holdingRepository.getHolding(order.instrument);

    let newQuantity: number;
    let newAveragePrice: number;
    let realizedPnL = 0;

    if (!existingHolding || existingHolding.quantity === 0) {
      // New holding
      newQuantity = order.side === 'BUY' ? order.filled_quantity : -order.filled_quantity;
      newAveragePrice = order.filled_price || order.price;
    } else {
      const currentQuantity = existingHolding.quantity;
      const currentAveragePrice = existingHolding.average_price;
      const orderQuantity = order.side === 'BUY' ? order.filled_quantity : -order.filled_quantity;
      const orderPrice = order.filled_price || order.price;

      if ((currentQuantity > 0 && orderQuantity > 0) || (currentQuantity < 0 && orderQuantity < 0)) {
        // Same direction - average the price
        const totalValue = currentQuantity * currentAveragePrice + orderQuantity * orderPrice;
        newQuantity = currentQuantity + orderQuantity;
        newAveragePrice = totalValue / newQuantity;
      } else {
        // Opposite direction - realize PnL
        const closingQuantity = Math.min(Math.abs(currentQuantity), Math.abs(orderQuantity));

        if (currentQuantity > 0) {
          // Selling from long position
          realizedPnL = closingQuantity * (orderPrice - currentAveragePrice);
        } else {
          // Buying to cover short position
          realizedPnL = closingQuantity * (currentAveragePrice - orderPrice);
        }

        newQuantity = currentQuantity + orderQuantity;

        if (newQuantity === 0) {
          newAveragePrice = 0;
        } else {
          newAveragePrice = Math.abs(newQuantity) === Math.abs(orderQuantity) ? orderPrice : currentAveragePrice;
        }
      }
    }

    await this.holdingRepository.updateHolding(order.instrument, newQuantity, newAveragePrice, realizedPnL);
  }

  private async createPositionFromOrder(order: Order): Promise<void> {
    await this.positionRepository.createPosition(
      order.instrument,
      order.side,
      order.filled_price || order.price,
      order.filled_quantity,
      order.filled_time || order.order_time
    );
  }

  private async updateHoldingFromPositionClosure(position: Position): Promise<void> {
    const holding = await this.holdingRepository.getHolding(position.instrument);
    if (!holding) return;

    // Add realized PnL to holdings
    await this.holdingRepository.updateHolding(
      position.instrument,
      holding.quantity,
      holding.average_price,
      position.pnl
    );
  }

  private validateOrderData(orderData: CreateOrderRequest): void {
    if (!orderData.instrument || typeof orderData.instrument !== 'string') {
      throw new ValidationError('Invalid instrument');
    }

    if (!['BUY', 'SELL'].includes(orderData.side)) {
      throw new ValidationError('Side must be BUY or SELL');
    }

    if (typeof orderData.quantity !== 'number' || orderData.quantity <= 0) {
      throw new ValidationError('Quantity must be a positive number');
    }

    if (typeof orderData.price !== 'number' || orderData.price <= 0) {
      throw new ValidationError('Price must be a positive number');
    }

    if (orderData.order_time && !(orderData.order_time instanceof Date)) {
      throw new ValidationError('Order time must be a valid Date object');
    }
  }
}
