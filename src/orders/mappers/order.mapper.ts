import { ServiceOrder } from '../entities/service-order.entity';

export interface TrackOrderResponse {
  id: string;
  status: string;
  vehicle: { plate: string; brand: string; model: string };
  totalPrice: number;
  services: { name: string; price: number }[];
  parts: { name: string; quantity: number; unitPrice: number }[];
  createdAt: Date;
  approvedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  deliveredAt: Date | null;
}

export interface OrderListItem {
  id: string;
  status: string;
  totalPrice: number;
  vehiclePlate: string | undefined;
  clientName: string | undefined;
  createdAt: Date;
  finishedAt: Date | null;
}

export class OrderMapper {
  static toTrackResponse(order: ServiceOrder): TrackOrderResponse {
    return {
      id: order.id,
      status: order.status,
      vehicle: {
        plate: order.vehicle.plate,
        brand: order.vehicle.brand,
        model: order.vehicle.model,
      },
      totalPrice: Number(order.totalPrice),
      services: order.services.map((s) => ({
        name: s.service.name,
        price: Number(s.price),
      })),
      parts: order.parts.map((p) => ({
        name: p.part.name,
        quantity: p.quantity,
        unitPrice: Number(p.unitPrice),
      })),
      createdAt: order.createdAt,
      approvedAt: order.approvedAt ?? null,
      startedAt: order.startedAt ?? null,
      finishedAt: order.finishedAt ?? null,
      deliveredAt: order.deliveredAt ?? null,
    };
  }

  static toListItem(order: ServiceOrder): OrderListItem {
    return {
      id: order.id,
      status: order.status,
      totalPrice: Number(order.totalPrice),
      vehiclePlate: order.vehicle?.plate,
      clientName: order.vehicle?.client?.name,
      createdAt: order.createdAt,
      finishedAt: order.finishedAt ?? null,
    };
  }

  static toList(orders: ServiceOrder[]): OrderListItem[] {
    return orders.map((o) => OrderMapper.toListItem(o));
  }
}
