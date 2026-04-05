import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST() {
  try {
    // Check if seed data already exists
    const existingUsers = await db.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({
        message: 'Seed data already exists. No new data was created.',
        existingRecords: existingUsers,
      })
    }

    // Create users
    const admin = await db.user.create({
      data: {
        email: 'admin@crew.com',
        password: hashPassword('password123'),
        name: 'Admin User',
        role: 'ADMIN',
      },
    })

    const captain1 = await db.user.create({
      data: {
        email: 'captain1@crew.com',
        password: hashPassword('password123'),
        name: 'Sarah Martinez',
        role: 'CAPTAIN',
      },
    })

    const captain2 = await db.user.create({
      data: {
        email: 'captain2@crew.com',
        password: hashPassword('password123'),
        name: 'James Wilson',
        role: 'CAPTAIN',
      },
    })

    const crew1 = await db.user.create({
      data: {
        email: 'crew1@crew.com',
        password: hashPassword('password123'),
        name: 'Alex Thompson',
        role: 'CREW',
      },
    })

    const crew2 = await db.user.create({
      data: {
        email: 'crew2@crew.com',
        password: hashPassword('password123'),
        name: 'Maria Garcia',
        role: 'CREW',
      },
    })

    const crew3 = await db.user.create({
      data: {
        email: 'crew3@crew.com',
        password: hashPassword('password123'),
        name: 'David Chen',
        role: 'CREW',
      },
    })

    const crew4 = await db.user.create({
      data: {
        email: 'crew4@crew.com',
        password: hashPassword('password123'),
        name: 'Emma Johnson',
        role: 'CREW',
      },
    })

    const crew5 = await db.user.create({
      data: {
        email: 'crew5@crew.com',
        password: hashPassword('password123'),
        name: 'Ryan Park',
        role: 'CREW',
      },
    })

    // Create divisions
    const div1 = await db.division.create({
      data: {
        name: 'Alpha Division',
        color: '#f59e0b',
        captainId: captain1.id,
      },
    })

    const div2 = await db.division.create({
      data: {
        name: 'Bravo Division',
        color: '#10b981',
        captainId: captain2.id,
      },
    })

    // Assign crew to divisions
    await db.user.updateMany({
      where: { id: { in: [crew1.id, crew2.id, crew3.id] } },
      data: { divisionId: div1.id },
    })

    await db.user.updateMany({
      where: { id: { in: [crew4.id, crew5.id] } },
      data: { divisionId: div2.id },
    })

    // Update captains' divisionId
    await db.user.update({ where: { id: captain1.id }, data: { divisionId: div1.id } })
    await db.user.update({ where: { id: captain2.id }, data: { divisionId: div2.id } })

    // Create clients
    const client1 = await db.client.create({
      data: {
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '(555) 100-2001',
        divisionId: div1.id,
        monthlyHours: 80,
      },
    })

    const client2 = await db.client.create({
      data: {
        name: 'Globex Industries',
        email: 'info@globex.com',
        phone: '(555) 200-3002',
        divisionId: div1.id,
        monthlyHours: 160,
      },
    })

    const client3 = await db.client.create({
      data: {
        name: 'Initech Solutions',
        email: 'support@initech.com',
        phone: '(555) 300-4003',
        divisionId: div2.id,
        monthlyHours: 120,
      },
    })

    const client4 = await db.client.create({
      data: {
        name: 'Umbrella Corp',
        email: 'hello@umbrella.com',
        phone: '(555) 400-5004',
        divisionId: div2.id,
        monthlyHours: 200,
      },
    })

    // Create tasks
    const tasks = await Promise.all([
      db.task.create({
        data: { title: 'Office Painting - Floor 1', description: 'Paint all rooms on floor 1', clientId: client1.id, crewId: crew1.id, estimatedHours: 8, priority: 'HIGH', status: 'IN_PROGRESS' },
      }),
      db.task.create({
        data: { title: 'Plumbing Repair - Restroom', description: 'Fix leaking pipes in restroom B', clientId: client1.id, crewId: crew2.id, estimatedHours: 4, priority: 'MEDIUM', status: 'PENDING' },
      }),
      db.task.create({
        data: { title: 'Carpet Installation', description: 'Install carpet in conference rooms A-C', clientId: client2.id, crewId: crew1.id, estimatedHours: 12, priority: 'HIGH', status: 'IN_PROGRESS' },
      }),
      db.task.create({
        data: { title: 'Electrical Wiring Check', description: 'Full electrical inspection and repair', clientId: client2.id, crewId: crew3.id, estimatedHours: 6, priority: 'URGENT', status: 'PENDING' },
      }),
      db.task.create({
        data: { title: 'Window Cleaning - Exterior', description: 'Clean all exterior windows', clientId: client3.id, crewId: crew4.id, estimatedHours: 5, priority: 'LOW', status: 'COMPLETED' },
      }),
      db.task.create({
        data: { title: 'HVAC Maintenance', description: 'Quarterly HVAC system maintenance', clientId: client3.id, crewId: crew5.id, estimatedHours: 8, priority: 'MEDIUM', status: 'IN_PROGRESS' },
      }),
      db.task.create({
        data: { title: 'Fire Safety Inspection', description: 'Annual fire safety systems inspection', clientId: client4.id, crewId: crew4.id, estimatedHours: 10, priority: 'URGENT', status: 'PENDING' },
      }),
      db.task.create({
        data: { title: 'Landscape Maintenance', description: 'General landscaping and lawn care', clientId: client4.id, crewId: crew5.id, estimatedHours: 6, priority: 'LOW', status: 'COMPLETED' },
      }),
      db.task.create({
        data: { title: 'Security System Upgrade', description: 'Install new security cameras and access control', clientId: client2.id, crewId: crew2.id, estimatedHours: 16, priority: 'HIGH', status: 'PENDING' },
      }),
      db.task.create({
        data: { title: 'Deep Cleaning - Warehouse', description: 'Full deep clean of warehouse area', clientId: client1.id, crewId: crew3.id, estimatedHours: 10, priority: 'MEDIUM', status: 'IN_PROGRESS' },
      }),
    ])

    // Create historical time entries (last 30 days)
    const now = new Date()
    const timeEntriesData = []
    const allCrew = [crew1, crew2, crew3, crew4, crew5]
    const taskClientMap = [
      { taskId: tasks[0].id, clientId: client1.id },
      { taskId: tasks[1].id, clientId: client1.id },
      { taskId: tasks[2].id, clientId: client2.id },
      { taskId: tasks[3].id, clientId: client2.id },
      { taskId: tasks[4].id, clientId: client3.id },
      { taskId: tasks[5].id, clientId: client3.id },
      { taskId: tasks[6].id, clientId: client4.id },
      { taskId: tasks[7].id, clientId: client4.id },
      { taskId: tasks[8].id, clientId: client2.id },
      { taskId: tasks[9].id, clientId: client1.id },
    ]

    // Generate ~50 time entries spread over the last 30 days
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30)
      const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      startTime.setHours(7 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0)

      const durationHours = 1 + Math.random() * 7 // 1 to 8 hours
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000)

      const taskIndex = Math.floor(Math.random() * taskClientMap.length)
      const crewIndex = Math.floor(Math.random() * allCrew.length)

      timeEntriesData.push({
        taskId: taskClientMap[taskIndex].taskId,
        crewId: allCrew[crewIndex].id,
        clientId: taskClientMap[taskIndex].clientId,
        startTime,
        endTime,
        duration: Math.round(durationHours * 10000) / 10000,
        note: i % 5 === 0 ? 'Completed without issues' : null,
      })
    }

    // Batch create time entries
    for (const entry of timeEntriesData) {
      await db.timeEntry.create({ data: entry })
    }

    return NextResponse.json({
      message: 'Seed data created successfully',
      stats: {
        users: 8,
        divisions: 2,
        clients: 4,
        tasks: tasks.length,
        timeEntries: timeEntriesData.length,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
