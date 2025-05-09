import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

dotenv.config();

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  const secret = process.env.JWT_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "JWT secret is not defined" },
      { status: 500 }
    );
  }

  try {
    const token = jwt.sign(
      { sub: walletAddress, walletAddress, aud: process.env.REALM_APP_ID },
      secret,
      { expiresIn: "1h" }
    );
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error generating token" },
      { status: 500 }
    );
  }
}
