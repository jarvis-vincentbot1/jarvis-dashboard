import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    console.error(`GET /api/orders/[${params.id}]:`, error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()

    // Recalculate totals if items provided
    let updateData: any = {
      status: body.status,
      paymentStatus: body.paymentStatus,
      shippingMethod: body.shippingMethod,
      trackingNumber: body.trackingNumber,
      notes: body.notes,
      internalNotes: body.internalNotes,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      shippedDate: body.shippedDate ? new Date(body.shippedDate) : undefined,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
    }

    if (body.tax !== undefined || body.shipping !== undefined || body.items) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: params.id },
        include: { items: true },
      })

      if (existingOrder) {
        let subtotal = existingOrder.subtotal
        if (body.items) {
          subtotal = body.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
        }
        updateData.subtotal = subtotal
        updateData.tax = body.tax !== undefined ? body.tax : existingOrder.tax
        updateData.shipping = body.shipping !== undefined ? body.shipping : existingOrder.shipping
        updateData.total = subtotal + updateData.tax + updateData.shipping
      }
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        items: true,
      },
    })

    return NextResponse.json({ data: order })
  } catch (error) {
    console.error(`PUT /api/orders/[${params.id}]:`, error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete order (cascades to items)
    await prisma.order.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/orders/[${params.id}]:`, error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
