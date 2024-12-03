import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from 'next/server';
import { SessionData } from '@/types';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const dbName = searchParams.get('db_name');

    if (!sessionId) {
        return NextResponse.json({ message: "Session ID is required" }, { status: 400 });
    }

    if (!dbName) {
        return NextResponse.json({ message: "Database name is required" }, { status: 400 });
    }

    console.log("sessionId", sessionId);
    console.log("dbName", dbName);

    if (sessionId === 'test') {
        const mockSession: SessionData = {
            sessionId: 'test',
            totalPrice: 100,
            totalPriceToken: 'STRK',
            payment_type: 'onetime',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            depositAddress: '0x55cce8396655fabebb24ed6e5f5c4543021a0e1b4d9e3a15d0640014b29b3ae',
            lineItems: [
                {
                    id: 'item1',
                    name: 'Mock Product',
                    price: 50,
                    currency: 'STRK',
                    quantity: 2,
                }
            ],
            status: 'pending',
        };
        return NextResponse.json(mockSession);
    }

    let client;
    try {
        const connectionString = process.env.DB_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('DB connection string is not defined');
        }
        client = new MongoClient(connectionString);
        await client.connect();
        const db = client.db(dbName);
        const sessions = db.collection("sessions");
        const session = await sessions.findOne({ sessionId });
        if (session) {
            return NextResponse.json(session);
        } else {
            return NextResponse.json({ message: "Session not found" }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ message: "Error fetching session data", error }, { status: 500 });
    } finally {
        if (client) {
            await client.close();
        }
    }
}
