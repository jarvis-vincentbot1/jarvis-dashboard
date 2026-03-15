import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('GET /api/orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Calculate totals from items
    let subtotal = 0
    if (body.items && Array.isArray(body.items)) {
      subtotal = body.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    }

    const tax = body.tax || 0
    const shipping = body.shipping || 0
    const total = subtotal + tax + shipping

    // Generate order number
    const count = await prisma.order.count()
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: body.customerId,
        status: body.status || 'pending',
        paymentStatus: body.paymentStatus || 'unpaid',
        subtotal,
        tax,
        shipping,
        total,
        currency: body.currency || 'EUR',
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        shippingMethod: body.shippingMethod,
        trackingNumber: body.trackingNumber,
        notes: body.notes,
        internalNotes: body.internalNotes,
        items: {
          create: (body.items || []).map((item: any) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            productCategory: item.productCategory,
            notes: item.notes,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
