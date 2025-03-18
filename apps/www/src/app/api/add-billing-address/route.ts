import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { sessionId, shippingAddress, contactInformation, tx_hash } =
    await req.json();

  if (!sessionId) {
    return NextResponse.json(
      { message: "Session ID is required" },
      { status: 400 },
    );
  }

  let client;

  try {
    const connectionString = process.env.DB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("DB connection string is not defined");
    }

    client = new MongoClient(connectionString);
    await client.connect();
    const db = client.db("StrapexDB");
    const sessions = db.collection("sessions");

    // Update the session object with the shipping address and contact information
    const result = await sessions.updateOne(
      { sessionId },
      {
        $set: {
          shippingAddress,
          contactInformation,
          status: "completed",
          tx_hash,
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Shipping address and contact information updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error updating shipping address and contact information",
        error,
      },
      { status: 500 },
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
